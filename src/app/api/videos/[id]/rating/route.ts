import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { videoRatingSchema } from "@/lib/validations/video";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/videos/[id]/rating — 영상 별점 등록/수정 (1~5 정수) */
export async function POST(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id: videoId } = await params;

  // 1. 영상 존재 여부 확인
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 2. 요청 파싱 + Zod 검증
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = videoRatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { value } = parsed.data;

  try {
    // 3. 트랜잭션: 기존 평가 조회 → upsert → ratingSum/ratingCount 원자적 업데이트
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.videoRating.findUnique({
        where: { userId_videoId: { userId: user.id, videoId } },
      });

      if (existing) {
        // 기존 평가 수정 — delta 패턴
        const sumDelta = value - existing.value;
        await tx.videoRating.update({
          where: { id: existing.id },
          data: { value },
        });
        await tx.video.update({
          where: { id: videoId },
          data: { ratingSum: { increment: sumDelta } },
        });
      } else {
        // 새 평가 등록
        await tx.videoRating.create({
          data: { userId: user.id, videoId, value },
        });
        await tx.video.update({
          where: { id: videoId },
          data: {
            ratingSum: { increment: value },
            ratingCount: { increment: 1 },
          },
        });
      }

      // 최신 상태 반환
      const updatedVideo = await tx.video.findUniqueOrThrow({
        where: { id: videoId },
        select: { ratingSum: true, ratingCount: true },
      });

      return {
        userRating: value,
        averageRating: updatedVideo.ratingCount > 0
          ? updatedVideo.ratingSum / updatedVideo.ratingCount
          : 0,
        ratingCount: updatedVideo.ratingCount,
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Failed to rate video:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "평가 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
