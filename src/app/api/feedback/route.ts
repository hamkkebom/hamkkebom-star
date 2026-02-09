import { NextResponse } from "next/server";
import { Prisma, SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createFeedbackSchema } from "@/lib/validations/feedback";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 피드백을 작성할 수 있습니다." } },
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

  const parsed = createFeedbackSchema.safeParse(body);

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
      const submission = await tx.submission.findUnique({
        where: { id: parsed.data.submissionId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!submission) {
        throw {
          code: "NOT_FOUND",
          message: "제출물을 찾을 수 없습니다.",
          status: 404,
        };
      }

      const feedback = await tx.feedback.create({
        data: {
          submissionId: parsed.data.submissionId,
          type: parsed.data.type,
          priority: parsed.data.priority,
          content: parsed.data.content.trim(),
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          annotation: parsed.data.annotation,
          authorId: user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (submission.status === SubmissionStatus.PENDING) {
        await tx.submission.update({
          where: { id: submission.id },
          data: { status: SubmissionStatus.IN_REVIEW },
        });
      }

      return feedback;
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      "message" in error &&
      "status" in error
    ) {
      return NextResponse.json(
        {
          error: {
            code: String(error.code),
            message: String(error.message),
          },
        },
        { status: Number(error.status) }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "피드백 등록 중 오류가 발생했습니다." } },
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

  if (user.role !== "ADMIN" && user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId")?.trim();

  if (!submissionId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "submissionId는 필수입니다." } },
      { status: 400 }
    );
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      starId: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && submission.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 제출물의 피드백만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  const where = { submissionId };

  const [rows, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
