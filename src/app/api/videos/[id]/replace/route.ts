import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getVideoStatus } from "@/lib/cloudflare/stream";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * streamUid로 Cloudflare Stream에서 duration을 가져와 DB에 저장합니다.
 * 비동기로 실행하여 요청 응답에 영향을 주지 않습니다.
 */
async function syncDuration(videoId: string, streamUid: string) {
  try {
    const info = await getVideoStatus(streamUid);
    if (!info || info.status.state !== "ready" || !info.duration) return;

    await prisma.videoTechnicalSpec.upsert({
      where: { videoId },
      update: {
        duration: info.duration,
        width: info.input?.width || null,
        height: info.input?.height || null,
      },
      create: {
        videoId,
        duration: info.duration,
        width: info.input?.width || null,
        height: info.input?.height || null,
      },
    });
  } catch (err) {
    console.error(`[syncDuration] videoId=${videoId} 실패:`, err);
  }
}

/**
 * 영상 파일 교체 — 새 streamUid로 교체
 */
export async function POST(request: Request, { params }: Params) {
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
    select: { ownerId: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && video.ownerId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 영상만 교체할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: { streamUid: string; r2Key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  if (!body.streamUid) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "streamUid는 필수입니다." } },
      { status: 400 }
    );
  }

  const updated = await prisma.video.update({
    where: { id },
    data: {
      streamUid: body.streamUid,
      r2Key: body.r2Key ?? undefined,
    },
    include: {
      owner: { select: { id: true, name: true } },
    },
  });

  // 비동기로 Cloudflare에서 duration 가져와 저장 (응답 차단 안 함)
  syncDuration(id, body.streamUid).catch(() => { });

  return NextResponse.json({ data: updated });
}
