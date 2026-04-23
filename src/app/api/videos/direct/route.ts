import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { VideoStatus, VideoSubject } from "@/generated/prisma/client";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "STAR") return NextResponse.json({ error: { code: "FORBIDDEN", message: "스타 계정만 사용할 수 있습니다." } }, { status: 403 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { canDirectUpload: true } });
  if (!dbUser?.canDirectUpload) return NextResponse.json({ error: { code: "FORBIDDEN", message: "직접 업로드 권한이 없습니다." } }, { status: 403 });

  let body: {
    title: string;
    streamUid: string;
    thumbnailUrl?: string;
    categoryId?: string;
    videoSubject?: string;
    counselorId?: string;
    description?: string;
    lyrics?: string;
    externalId?: string;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } }, { status: 400 });
  }

  if (!body.title?.trim() || !body.streamUid) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "title과 streamUid는 필수입니다." } }, { status: 400 });
  }

  const video = await prisma.video.create({
    data: {
      title: body.title.trim(),
      streamUid: body.streamUid,
      thumbnailUrl: body.thumbnailUrl || null,
      status: VideoStatus.APPROVED,
      videoSubject: (body.videoSubject as VideoSubject) || VideoSubject.OTHER,
      ownerId: user.id,
      categoryId: body.categoryId || null,
      counselorId: body.counselorId || null,
      description: body.description || null,
      lyrics: body.lyrics || null,
      externalId: body.externalId || null,
    },
    select: { id: true, title: true, status: true, streamUid: true },
  });

  return NextResponse.json({ data: video }, { status: 201 });
}
