import { NextResponse } from "next/server";
import { AssignmentStatus, Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createSubmissionSchema } from "@/lib/validations/submission";
import { triggerAiAnalysis } from "@/lib/ai/trigger";

type ApiError = {
  code: string;
  message: string;
  status: number;
};

const submissionStatuses = new Set(Object.values(SubmissionStatus));

function toErrorResponse(error: ApiError) {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: error.status }
  );
}




export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 제출물을 등록할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = createSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const assignment = await tx.projectAssignment.findUnique({
        where: { id: parsed.data.assignmentId },
        select: {
          id: true,
          status: true,
          starId: true,
        },
      });

      if (!assignment) {
        throw {
          code: "NOT_FOUND",
          message: "배정 정보를 찾을 수 없습니다.",
          status: 404,
        } satisfies ApiError;
      }

      if (assignment.starId !== user.id) {
        throw {
          code: "FORBIDDEN",
          message: "본인에게 배정된 작업만 제출할 수 있습니다.",
          status: 403,
        } satisfies ApiError;
      }

      // 0. 카테고리 유효성 검사 (입력된 경우)
      if (parsed.data.categoryId) {
        const categoryExists = await tx.category.findUnique({ where: { id: parsed.data.categoryId } });
        if (!categoryExists) {
          throw {
            code: "BAD_REQUEST",
            message: "존재하지 않는 카테고리입니다.",
            status: 400,
          } satisfies ApiError;
        }
      }

      // 1. 비디오 레코드 생성 (최초 버전)
      const newVideo = await tx.video.create({
        data: {
          title: parsed.data.versionTitle || "Untitled Video",
          streamUid: parsed.data.streamUid,
          thumbnailUrl: parsed.data.thumbnailUrl,
          ownerId: user.id,
          status: "DRAFT", // 초기 상태
          lyrics: parsed.data.lyrics,
          categoryId: parsed.data.categoryId,
          description: parsed.data.description, // ✅ Video 설명 (제작의도)
          videoSubject: parsed.data.videoSubject || "OTHER",
          counselorId: parsed.data.counselorId || null,
          externalId: parsed.data.externalId || null,
          technicalSpec: {
            create: {
              // duration은 클라이언트에서 보내주거나, 추후 업데이트
              duration: 0
            }
          }
        }
      });

      // 2. 제출물 생성 (Video 연결)
      const submission = await tx.submission.create({
        data: {
          assignmentId: parsed.data.assignmentId,
          versionSlot: parsed.data.versionSlot ?? 0,
          versionTitle: parsed.data.versionTitle,
          version: "1.0",
          streamUid: parsed.data.streamUid,
          summaryFeedback: parsed.data.description || null, // Submission에도 백업
          thumbnailUrl: parsed.data.thumbnailUrl,
          starId: user.id,
          videoId: newVideo.id, // Video 연결
        },
      });

      if (assignment.status === AssignmentStatus.ACCEPTED) {
        await tx.projectAssignment.update({
          where: { id: assignment.id },
          data: { status: AssignmentStatus.IN_PROGRESS },
        });
      }

      return submission;
    });

    // 업로드 완료 후 AI 분석 자동 트리거 (fire-and-forget)
    triggerAiAnalysis(created.id).catch(() => { });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error &&
      "status" in error
    ) {
      return toErrorResponse(error as ApiError);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: { code: "SLOT_OCCUPIED", message: "이미 사용 중인 버전 슬롯입니다." } },
        { status: 409 }
      );
    }

    console.error(error); // 디버깅용 로그

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "제출물 등록 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const requestId = searchParams.get("requestId")?.trim();
  const starId = searchParams.get("starId")?.trim();
  const status = searchParams.get("status");

  if (status && status !== "ALL" && status !== "COMPLETED" && !submissionStatuses.has(status as SubmissionStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where = {
    ...(starId ? { starId } : {}),
    ...(status === "COMPLETED"
      ? { status: { in: [SubmissionStatus.APPROVED, SubmissionStatus.REJECTED, SubmissionStatus.REVISED] } }
      : status && status !== "ALL"
        ? { status: status as SubmissionStatus }
        : {}),
    ...(requestId
      ? {
        assignment: {
          requestId,
        },
      }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        star: {
          select: {
            id: true,
            name: true,
            chineseName: true,
            email: true,
          },
        },
        assignment: {
          include: {
            request: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        _count: {
          select: {
            feedbacks: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
