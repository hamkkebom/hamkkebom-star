import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getVideoStatus } from "@/lib/cloudflare/stream";

/**
 * duration이 없는 영상을 Cloudflare에서 자동으로 가져와 저장 (lazy sync)
 */
async function lazySyncDuration(videoId: string, streamUid: string | null, hasDuration: boolean) {
  if (!streamUid || hasDuration) return;
  try {
    const info = await getVideoStatus(streamUid);
    if (!info || info.status.state !== "ready" || !info.duration) return;
    await prisma.videoTechnicalSpec.upsert({
      where: { videoId },
      update: { duration: info.duration, width: info.input?.width || null, height: info.input?.height || null },
      create: { videoId, duration: info.duration, width: info.input?.width || null, height: info.input?.height || null },
    });
  } catch { /* 실패해도 무시 — 다음 조회 시 재시도 */ }
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  // 공개 영상(APPROVED/FINAL)은 인증 없이 조회 가능
  const user = await getAuthUser().catch(() => null);
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, chineseName: true, email: true, avatarUrl: true } },
      category: { select: { id: true, name: true, slug: true } },
      counselor: { select: { id: true, displayName: true } },
      technicalSpec: true,
      eventLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!video) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 비공개 영상(DRAFT/PENDING)은 인증 필요
  if (video.status !== "APPROVED" && video.status !== "FINAL" && !user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  // duration이 없으면 백그라운드에서 Cloudflare 동기화
  lazySyncDuration(video.id, video.streamUid, !!video.technicalSpec?.duration).catch(() => { });

  return NextResponse.json({ data: video });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const existing = await prisma.video.findUnique({
    where: { id },
    select: { ownerId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && existing.ownerId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 영상만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const allowedFields = ["title", "description", "categoryId", "thumbnailUrl", "status", "lyrics", "videoSubject"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.video.update({
    where: { id },
    data,
    include: {
      owner: { select: { id: true, name: true, chineseName: true, email: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
