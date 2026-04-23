import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { resolveSignedThumbnail } from "@/lib/thumbnail";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const videos = await prisma.video.findMany({
    where: { ownerId: user.id, status: "APPROVED" },
    select: {
      id: true,
      title: true,
      thumbnailUrl: true,
      streamUid: true,
      viewCount: true,
      isPortfolioVisible: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const signed = await Promise.all(
    videos.map(async (v) => ({
      ...v,
      signedThumbnailUrl: await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid),
    }))
  );

  return NextResponse.json({ data: signed });
}
