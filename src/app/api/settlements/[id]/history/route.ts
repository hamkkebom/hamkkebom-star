import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/settlements/[id]/history
 *
 * 정산 변경 이력을 조회합니다.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const history = await prisma.settlementHistory.findMany({
    where: { settlementId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: history });
}
