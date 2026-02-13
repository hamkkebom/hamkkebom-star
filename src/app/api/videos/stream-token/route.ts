import { NextResponse, NextRequest } from "next/server";
import { VideoStatus } from "@/generated/prisma/client";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/videos/stream-token?uid=xxx
 * Cloudflare Stream 재생을 위한 서명된 토큰 발급.
 * 인증 사용자: 무조건 토큰 발급.
 * 비인증 사용자: 공개 영상(APPROVED/FINAL)인 경우에만 토큰 발급.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser().catch(() => null);

  const uid = request.nextUrl.searchParams.get("uid");
  if (!uid) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "uid 파라미터가 필요합니다." } },
      { status: 400 }
    );
  }

  // 비인증 사용자는 공개 영상(APPROVED/FINAL)만 재생 가능
  if (!user) {
    const publicVideo = await prisma.video.findFirst({
      where: {
        streamUid: uid,
        status: { in: [VideoStatus.APPROVED, VideoStatus.FINAL] },
      },
      select: { id: true },
    });

    if (!publicVideo) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }
  }

  const token = await getSignedPlaybackToken(uid);
  if (!token) {
    return NextResponse.json(
      { error: { code: "TOKEN_FAILED", message: "토큰 생성에 실패했습니다." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      token,
      // iframe embed URL with signed token
      embedUrl: `https://iframe.videodelivery.net/${token}`,
      // HLS manifest URL with signed token (for native video player with timestamp support)
      hlsUrl: `https://videodelivery.net/${token}/manifest/video.m3u8`,
    },
  });
}
