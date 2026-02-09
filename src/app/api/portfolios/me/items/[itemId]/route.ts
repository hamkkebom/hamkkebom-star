import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { itemId } = await params;

  const item = await prisma.portfolioItem.findUnique({
    where: { id: itemId },
    include: { portfolio: { select: { userId: true } } },
  });

  if (!item) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "포트폴리오 항목을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && item.portfolio.userId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 포트폴리오만 수정할 수 있습니다." } },
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

  const allowedFields = ["title", "description", "thumbnailUrl", "videoUrl", "sortOrder"];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.portfolioItem.update({
    where: { id: itemId },
    data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { itemId } = await params;

  const item = await prisma.portfolioItem.findUnique({
    where: { id: itemId },
    include: { portfolio: { select: { userId: true } } },
  });

  if (!item) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "포트폴리오 항목을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (user.role === "STAR" && item.portfolio.userId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 포트폴리오만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  await prisma.portfolioItem.delete({ where: { id: itemId } });
  return NextResponse.json({ data: { success: true } });
}
