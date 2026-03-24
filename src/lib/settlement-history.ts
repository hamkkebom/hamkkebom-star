import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type PrismaTx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * 정산 변경 이력을 기록합니다.
 */
export async function recordSettlementHistory(params: {
  settlementId: string;
  action: string;
  actorId: string;
  actorName: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.settlementHistory.create({
      data: {
        settlementId: params.settlementId,
        action: params.action,
        actorId: params.actorId,
        actorName: params.actorName,
        field: params.field ?? null,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        metadata: params.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[SettlementHistory] 이력 기록 실패:", err);
  }
}

/**
 * 트랜잭션 내에서 이력을 기록합니다.
 */
export async function recordSettlementHistoryTx(
  tx: PrismaTx,
  params: {
    settlementId: string;
    action: string;
    actorId: string;
    actorName: string;
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
) {
  await tx.settlementHistory.create({
    data: {
      settlementId: params.settlementId,
      action: params.action,
      actorId: params.actorId,
      actorName: params.actorName,
      field: params.field ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      metadata: params.metadata ?? undefined,
    },
  });
}
