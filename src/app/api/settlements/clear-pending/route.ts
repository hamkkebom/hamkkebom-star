import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/clear-pending
 *
 * 어드민이 정산 페이지를 이탈할 때 미확정(PENDING/REVIEW) 정산을 일괄 삭제.
 * PROCESSING 이상은 실제 송금이 진행 중이므로 삭제하지 않음.
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  const toDelete = await prisma.settlement.findMany({
    where: { status: { in: [SettlementStatus.PENDING, SettlementStatus.REVIEW] } },
    select: { id: true },
  });

  const ids = toDelete.map((s: { id: string }) => s.id);
  if (ids.length === 0) {
    return NextResponse.json({ data: { deletedCount: 0 } });
  }

  await prisma.settlementItem.deleteMany({ where: { settlementId: { in: ids } } });
  const { count } = await prisma.settlement.deleteMany({ where: { id: { in: ids } } });

  return NextResponse.json({ data: { deletedCount: count } });
}
