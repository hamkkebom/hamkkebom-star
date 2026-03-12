import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/admin/sanctions/[id] — 제재 상세 (사용자, 적용자, 신고, 이의신청) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  const sanction = await prisma.userSanction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          isBanned: true,
          suspendedUntil: true,
          warningCount: true,
          createdAt: true,
        },
      },
      appliedBy: {
        select: { id: true, name: true, email: true },
      },
      revokedBy: {
        select: { id: true, name: true, email: true },
      },
      report: {
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      },
      appeals: {
        orderBy: { createdAt: "desc" },
        include: {
          reviewedBy: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!sanction) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제재 기록을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: sanction });
}
