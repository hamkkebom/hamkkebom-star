import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } }, { status: 403 });

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, showVideosPublicly: true } });
  if (!target) return NextResponse.json({ error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { showVideosPublicly: !target.showVideosPublicly },
    select: { id: true, showVideosPublicly: true },
  });

  return NextResponse.json({ data: updated });
}
