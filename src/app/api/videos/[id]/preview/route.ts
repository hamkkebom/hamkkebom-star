import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

/**
 * Cloudflare Stream signed URL 생성
 * 현재는 unsigned URL을 반환. RSA PEM 키 설정 후 서명 추가 예정.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    select: { id: true, streamUid: true, title: true, thumbnailUrl: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (!video.streamUid) {
    return NextResponse.json(
      { error: { code: "NOT_AVAILABLE", message: "스트리밍 영상이 등록되지 않았습니다." } },
      { status: 404 }
    );
  }

  const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

  // HLS 재생 URL (Cloudflare Stream 기본 형식)
  const hlsUrl = `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${video.streamUid}/manifest/video.m3u8`;
  const dashUrl = `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${video.streamUid}/manifest/video.mpd`;
  const thumbnailUrl = video.thumbnailUrl
    || `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${video.streamUid}/thumbnails/thumbnail.jpg`;

  return NextResponse.json({
    data: {
      videoId: video.id,
      streamUid: video.streamUid,
      hlsUrl,
      dashUrl,
      thumbnailUrl,
    },
  });
}
