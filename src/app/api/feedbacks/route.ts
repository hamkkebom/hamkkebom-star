import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createFeedbackSchema } from "@/lib/validations/feedback";

export const dynamic = "force-dynamic";

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
    const feedback = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.findUnique({
        where: { id: parsed.data.submissionId },
        select: { id: true, status: true }
      });

      if (!sub) {
        throw new Error("NOT_FOUND");
      }

      const created = await tx.feedback.create({
        data: {
          submissionId: parsed.data.submissionId,
          authorId: user.id,
          type: parsed.data.type,
          priority: parsed.data.priority,
          content: parsed.data.content,
          startTime: parsed.data.startTime ?? null,
          endTime: parsed.data.endTime ?? null,
          annotation: parsed.data.annotation ?? Prisma.JsonNull,
        },
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
      });

      if (sub.status === "PENDING") {
        await tx.submission.update({
          where: { id: sub.id },
          data: { status: "IN_REVIEW" }
        });
      }

      return created;
    });

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
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

  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId");

  if (!submissionId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "submissionId가 필요합니다." } },
      { status: 400 }
    );
  }

  // STAR는 자신의 제출물 피드백만 조회
  if (user.role === "STAR") {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { starId: true },
    });

    if (!submission || submission.starId !== user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "본인 제출물의 피드백만 조회할 수 있습니다." } },
        { status: 403 }
      );
    }
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { submissionId },
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
  });

  return NextResponse.json({ data: feedbacks });
}
