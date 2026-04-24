import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
export const dynamic = "force-dynamic";

// 직접 업로드 영상 전용 엔드포인트
// Submission 없이 생성된 Video(직접 업로드)만 반환
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const videos = await prisma.video.findMany({
    where: {
      ownerId: user.id,
      submissions: { none: {} },
    },
    select: {
      id: true,
      title: true,
      streamUid: true,
      thumbnailUrl: true,
      status: true,
      viewCount: true,
      createdAt: true,
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 썸네일 presign
  type VideoRow = (typeof videos)[number];
  const withThumbs = await Promise.all(
    videos.map(async (v: VideoRow) => {
      let signedThumbnailUrl: string | null = null;
      if (v.thumbnailUrl) {
        const key = extractR2Key(v.thumbnailUrl);
        if (key) {
          try { signedThumbnailUrl = await getPresignedGetUrl(key); } catch { /* ignore */ }
        }
      }
      if (!signedThumbnailUrl && v.streamUid) {
        try {
          const token = await getSignedPlaybackToken(v.streamUid);
          if (token) signedThumbnailUrl = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
        } catch { /* ignore */ }
      }
      return { ...v, signedThumbnailUrl };
    })
  );

  return NextResponse.json({ data: withThumbs });
}
