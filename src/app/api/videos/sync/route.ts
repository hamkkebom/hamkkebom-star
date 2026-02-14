import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getVideoStatus } from "@/lib/cloudflare/stream";

/**
 * POST /api/videos/sync
 *
 * streamUid가 있지만 technicalSpec.duration이 NULL인 영상들을
 * Cloudflare Stream에서 조회하여 duration 등 기술 스펙을 자동 저장합니다.
 * ADMIN 전용.
 */
export async function POST() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 동기화를 실행할 수 있습니다." } },
      { status: 403 }
    );
  }

  // streamUid가 있고 duration이 없는 영상 조회
  const videos = await prisma.video.findMany({
    where: {
      streamUid: { not: null },
      OR: [
        { technicalSpec: null },
        { technicalSpec: { duration: null } },
      ],
    },
    select: { id: true, streamUid: true },
  });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const video of videos) {
    if (!video.streamUid) continue;

    try {
      const info = await getVideoStatus(video.streamUid);
      if (!info || info.status.state !== "ready") {
        // 아직 인코딩 중이거나 에러 — 건너뜀
        continue;
      }

      await prisma.videoTechnicalSpec.upsert({
        where: { videoId: video.id },
        update: {
          duration: info.duration || null,
          width: info.input?.width || null,
          height: info.input?.height || null,
        },
        create: {
          videoId: video.id,
          duration: info.duration || null,
          width: info.input?.width || null,
          height: info.input?.height || null,
        },
      });

      synced++;
    } catch (err) {
      failed++;
      errors.push(`${video.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    data: {
      total: videos.length,
      synced,
      failed,
      errors: errors.slice(0, 10), // 최대 10개만
      message: `${synced}개 영상의 duration을 동기화했습니다.`,
    },
  });
}
