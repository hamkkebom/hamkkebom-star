import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

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

  return NextResponse.json({ data: updated });
}
