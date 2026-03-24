import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
import { recordSettlementHistory } from "@/lib/settlement-history";
export const dynamic = "force-dynamic";

/**
 * POST /api/settlements/bulk
 *
 * 일괄 확정 / 취소 / 삭제
 * Body: { action: "CONFIRM" | "CANCEL" | "DELETE", ids: string[] }
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  let body: { action: string; ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { action, ids } = body;

  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "action과 ids가 필요합니다." } },
      { status: 400 }
    );
  }

  if (ids.length > 50) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "최대 50건까지 일괄 처리 가능합니다." } },
      { status: 400 }
    );
  }

  const validActions = ["CONFIRM", "CANCEL", "DELETE"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 액션입니다." } },
      { status: 400 }
    );
  }

  const settlements = await prisma.settlement.findMany({
    where: { id: { in: ids } },
    select: { id: true, status: true, starId: true },
  });

  const results: { success: number; failed: number; errors: { id: string; reason: string }[] } = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const s of settlements) {
    try {
      if (action === "CONFIRM") {
        if (s.status === SettlementStatus.COMPLETED) {
          results.errors.push({ id: s.id, reason: "이미 확정된 정산입니다." });
          results.failed++;
          continue;
        }
        await prisma.settlement.update({
          where: { id: s.id },
          data: {
            status: SettlementStatus.COMPLETED,
            confirmedAt: new Date(),
            confirmedBy: user.id,
          },
        });
        void recordSettlementHistory({
          settlementId: s.id,
          action: "CONFIRMED",
          actorId: user.id,
          actorName: user.name,
        });
        results.success++;
      } else if (action === "CANCEL") {
        if (s.status !== SettlementStatus.COMPLETED) {
          results.errors.push({ id: s.id, reason: "확정된 정산만 취소할 수 있습니다." });
          results.failed++;
          continue;
        }
        await prisma.settlement.update({
          where: { id: s.id },
          data: {
            status: SettlementStatus.PENDING,
            confirmedAt: null,
            confirmedBy: null,
          },
        });
        void recordSettlementHistory({
          settlementId: s.id,
          action: "CANCELLED",
          actorId: user.id,
          actorName: user.name,
        });
        results.success++;
      } else if (action === "DELETE") {
        if (s.status === SettlementStatus.COMPLETED) {
          results.errors.push({ id: s.id, reason: "확정된 정산은 삭제할 수 없습니다." });
          results.failed++;
          continue;
        }
        await prisma.settlementItem.deleteMany({ where: { settlementId: s.id } });
        await prisma.settlement.delete({ where: { id: s.id } });
        results.success++;
      }
    } catch (err) {
      results.errors.push({ id: s.id, reason: "처리 중 오류가 발생했습니다." });
      results.failed++;
      console.error(`[Bulk Settlement ${action}] ID: ${s.id}`, err);
    }
  }

  // 찾을 수 없는 ID 처리
  const foundIds = new Set(settlements.map((s) => s.id));
  for (const id of ids) {
    if (!foundIds.has(id)) {
      results.errors.push({ id, reason: "정산을 찾을 수 없습니다." });
      results.failed++;
    }
  }

  void createAuditLog({
    actorId: user.id,
    action: `BULK_${action}_SETTLEMENTS`,
    entityType: "Settlement",
    entityId: "batch",
    metadata: { count: results.success, ids },
  });

  return NextResponse.json({ data: results });
}
