import { NextResponse, NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";

/**
 * GET /api/videos/stream-token?uid=xxx
 * Cloudflare Stream 재생을 위한 서명된 토큰 발급.
 * 인증된 사용자만 요청 가능합니다.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const uid = request.nextUrl.searchParams.get("uid");
  if (!uid) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "uid 파라미터가 필요합니다." } },
      { status: 400 }
    );
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
    },
  });
}
