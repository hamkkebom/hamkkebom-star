import { NextResponse } from "next/server";
import { AssignmentStatus, Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createSubmissionSchema } from "@/lib/validations/submission";
import { triggerAiAnalysis } from "@/lib/ai/trigger";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";
export const dynamic = "force-dynamic";

// ── 썸네일 URL 메모리 캐시 (TTL 50분) ──
const thumbnailCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000;

function getCachedThumbnail(key: string): string | null {
  const cached = thumbnailCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) thumbnailCache.delete(key);
  return null;
}

function setCachedThumbnail(key: string, url: string): void {
  thumbnailCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  if (thumbnailCache.size > 500) {
    const firstKey = thumbnailCache.keys().next().value;
    if (firstKey) thumbnailCache.delete(firstKey);
  }
}

async function resolveThumbnail(
  submissionId: string,
  subThumbUrl: string | null,
  videoThumbUrl: string | null,
  _streamUid: string | null,
  _videoStreamUid: string | null
): Promise<string | null> {
  const cacheKey = `sub-thumb:${submissionId}`;
  const cached = getCachedThumbnail(cacheKey);
  if (cached) return cached;

  let url: string | null = null;

  if (subThumbUrl) {
    const r2Key = extractR2Key(subThumbUrl);
    if (r2Key) {
      try { url = await getPresignedGetUrl(r2Key); } catch { /* ignore */ }
    }
  }

  if (!url && videoThumbUrl) {
    const r2Key = extractR2Key(videoThumbUrl);
    if (r2Key) {
      try { url = await getPresignedGetUrl(r2Key); } catch { /* ignore */ }
    }
  }

  // CF Stream 토큰 기반 썸네일은 424 에러 발생하므로 사용하지 않음
  // R2 썸네일이 없으면 null 반환 → 클라이언트에서 Film 아이콘 fallback

  if (url) setCachedThumbnail(cacheKey, url);
  return url;
}

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

      if (assignment.status === AssignmentStatus.PENDING_APPROVAL || assignment.status === AssignmentStatus.REJECTED) {
        throw {
          code: "FORBIDDEN",
          message: "승인되지 않은 프로젝트에는 제출할 수 없습니다.",
          status: 403,
        } satisfies ApiError;
      }

      // 마감 여부 자동 감지 (마감 후 제출 플래그)
      const linkedRequest = await tx.projectRequest.findFirst({
        where: { assignments: { some: { id: parsed.data.assignmentId } } },
        select: { deadline: true, status: true },
      });
      const isLate = !!(linkedRequest && (
        linkedRequest.status === "CLOSED" ||
        new Date(linkedRequest.deadline) < new Date()
      ));

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
          isLateSubmission: isLate, // 마감 후 제출 여부
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
  const assignmentId = searchParams.get("assignmentId")?.trim();
  const status = searchParams.get("status");

  if (status && status !== "ALL" && status !== "COMPLETED" && !submissionStatuses.has(status as SubmissionStatus)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 상태값입니다." } },
      { status: 400 }
    );
  }

  const where = {
    ...(starId ? { starId } : {}),
    ...(assignmentId ? { assignmentId } : {}),
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

  // 상태 필터 무관하게 전체 카운트 조회용 (requestId/starId/assignmentId만 유지)
  const baseWhere = {
    ...(starId ? { starId } : {}),
    ...(assignmentId ? { assignmentId } : {}),
    ...(requestId ? { assignment: { requestId } } : {}),
  };

  const [rows, total, pendingCount, inReviewCount, approvedCount, rejectedCount, revisedCount] = await Promise.all([
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
        video: {
          select: {
            title: true,
            streamUid: true,
            thumbnailUrl: true,
          },
        },
        feedbacks: {
          select: {
            id: true,
            status: true,
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
    prisma.submission.count({ where: { ...baseWhere, status: SubmissionStatus.PENDING } }),
    prisma.submission.count({ where: { ...baseWhere, status: SubmissionStatus.IN_REVIEW } }),
    prisma.submission.count({ where: { ...baseWhere, status: SubmissionStatus.APPROVED } }),
    prisma.submission.count({ where: { ...baseWhere, status: SubmissionStatus.REJECTED } }),
    prisma.submission.count({ where: { ...baseWhere, status: SubmissionStatus.REVISED } }),
  ]);

  // ✅ 썸네일 생성 — 최대 5개씩 병렬 처리 (외부 API 과부하 방지)
  const BATCH_SIZE = 5;
  const allThumbnails: (string | null)[] = new Array(rows.length).fill(null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const thumbs = await Promise.all(
      batch.map((row) =>
        resolveThumbnail(
          row.id,
          row.thumbnailUrl ?? null,
          row.video?.thumbnailUrl ?? null,
          row.streamUid ?? null,
          row.video?.streamUid ?? null
        )
      )
    );
    thumbs.forEach((t, j) => { allThumbnails[i + j] = t; });
  }

  const rowsWithThumbnails = rows.map((row, idx) => ({
    ...row,
    signedThumbnailUrl: allThumbnails[idx],
  }));

  return NextResponse.json({
    data: rowsWithThumbnails,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    statusCounts: {
      pending: pendingCount,
      inReview: inReviewCount,
      completed: approvedCount + rejectedCount + revisedCount,
      total: pendingCount + inReviewCount + approvedCount + rejectedCount + revisedCount,
    },
  });
}
