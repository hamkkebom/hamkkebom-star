import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { adjustItemSchema } from "@/lib/validations/settlement";
import { createAuditLog } from "@/lib/audit";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 금액을 조정할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id, itemId } = await params;

  // 요청 파싱
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  // Zod 검증
  const parsed = adjustItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { adjustedAmount } = parsed.data;

  // 정산 존재 및 상태 확인
  const settlement = await prisma.settlement.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (settlement.status !== "PENDING" && settlement.status !== "PROCESSING") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "완료된 정산은 수정할 수 없습니다." } },
      { status: 403 }
    );
  }

  // 해당 정산에 속한 항목인지 확인
  const item = await prisma.settlementItem.findFirst({
    where: { id: itemId, settlementId: id },
  });

  if (!item) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산 항목을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // $transaction: 항목 업데이트 + 정산 총액 재계산
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.settlementItem.update({
      where: { id: itemId },
      data: {
        adjustedAmount,
        finalAmount: adjustedAmount,
      },
    });

    // 정산 총액 재계산
    const allItems = await tx.settlementItem.findMany({
      where: { settlementId: id },
      select: { finalAmount: true },
    });

    const totalAmount = allItems.reduce(
      (sum, i) => sum + Number(i.finalAmount),
      0
    );

    await tx.settlement.update({
      where: { id },
      data: { totalAmount },
    });

    return { updated, totalAmount };
  });

  void createAuditLog({
    actorId: user.id,
    action: "ADJUST_SETTLEMENT_ITEM",
    entityType: "SettlementItem",
    entityId: itemId,
    metadata: {
      settlementId: id,
    },
    changes: {
      adjustedAmount: { from: item.adjustedAmount, to: adjustedAmount },
      finalAmount: { from: item.finalAmount, to: adjustedAmount },
    },
  });

  return NextResponse.json({
    data: {
      id: result.updated.id,
      adjustedAmount: Number(result.updated.adjustedAmount),
      finalAmount: Number(result.updated.finalAmount),
    },
  });
}
