import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { computeVideoAphash } from "@/lib/video-aphash";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/admin/videos/compute-aphash
 *
 * 특정 정산의 모든 영상에 대해 audioPhash가 비어있으면 계산해서 저장.
 *
 * Body: { settlementId: string }
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  let body: { settlementId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } },
      { status: 400 }
    );
  }

  if (!body.settlementId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "settlementId가 필요합니다." } },
      { status: 400 }
    );
  }

  const items = await prisma.settlementItem.findMany({
    where: { settlementId: body.settlementId },
    select: {
      submission: {
        select: {
          video: {
            select: {
              id: true,
              streamUid: true,
              audioPhash: true,
              technicalSpec: { select: { duration: true } },
            },
          },
        },
      },
    },
  });

  type VideoRow = { id: string; streamUid: string; audioPhash: string | null; technicalSpec: { duration: number | null } | null };
  const videos: VideoRow[] = [];
  for (const it of items) {
    const v = it.submission?.video;
    if (v && v.streamUid && !v.audioPhash) {
      videos.push({ id: v.id, streamUid: v.streamUid, audioPhash: v.audioPhash, technicalSpec: v.technicalSpec });
    }
  }

  if (videos.length === 0) {
    return NextResponse.json({ data: { processed: 0, message: "이미 모든 영상의 오디오 hash가 계산되어 있습니다." } });
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const video of videos) {
    try {
      const hash = await computeVideoAphash(video.streamUid, video.technicalSpec?.duration ?? null);
      await prisma.video.update({
        where: { id: video.id },
        data: { audioPhash: hash },
      });
      success++;
    } catch (err) {
      console.error(`[compute-aphash] video ${video.id} 실패:`, err);
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${video.id.slice(0, 8)}: ${msg}`);
    }
  }

  const message =
    success === 0 && failed > 0
      ? `${failed}개 영상 모두 오디오 분석 실패`
      : `${success}개 영상 오디오 처리 완료${failed > 0 ? ` (${failed}개 실패)` : ""}`;

  return NextResponse.json({
    data: {
      processed: success,
      failed,
      total: videos.length,
      errors: errors.slice(0, 5),
      message,
    },
  });
}
