import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ videoId: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { videoId } = await params;

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, ownerId: true, isPortfolioVisible: true },
  });

  if (!video) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (video.ownerId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 영상만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: { isPortfolioVisible: !video.isPortfolioVisible },
    select: { id: true, isPortfolioVisible: true },
  });

  return NextResponse.json({ data: updated });
}
