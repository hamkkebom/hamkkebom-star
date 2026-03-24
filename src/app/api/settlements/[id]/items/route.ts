import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { recordSettlementHistory } from "@/lib/settlement-history";
import { calculateTax } from "@/lib/settlement-utils";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/settlements/[id]/items
 *
 * 정산에 수동 항목(보너스, 공제 등)을 추가합니다.
 * Body: { itemType: string, amount: number, description: string }
 */
export async function POST(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: { itemType: string; amount: number; description: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { itemType, amount, description } = body;

  const validTypes = ["BONUS", "DEDUCTION", "PENALTY", "TRANSPORT", "EQUIPMENT", "AI_TOOL_SUPPORT", "OTHER"];
  if (!itemType || !validTypes.includes(itemType)) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "유효하지 않은 항목 유형입니다." } },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount === 0) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "금액을 입력해주세요." } },
      { status: 400 }
    );
  }

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    select: { id: true, starId: true, status: true, totalAmount: true },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  if (settlement.status === "COMPLETED") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "확정된 정산에는 항목을 추가할 수 없습니다." } },
      { status: 403 }
    );
  }

  // 항목 생성
  const item = await prisma.settlementItem.create({
    data: {
      settlementId: id,
      starId: settlement.starId,
      itemType,
      description: description || itemType,
      baseAmount: Math.abs(amount),
      finalAmount: itemType === "DEDUCTION" || itemType === "PENALTY" ? -Math.abs(amount) : Math.abs(amount),
      adjustedAmount: null,
    },
  });

  // totalAmount 재계산
  const allItems = await prisma.settlementItem.findMany({
    where: { settlementId: id },
    select: { finalAmount: true },
  });
  const newTotal = allItems.reduce((sum, i) => sum + Number(i.finalAmount), 0);
  const { incomeTax, localTax } = calculateTax(newTotal);
  const taxAmount = incomeTax + localTax;
  const netAmount = newTotal - taxAmount;

  await prisma.settlement.update({
    where: { id },
    data: { totalAmount: newTotal, taxAmount, netAmount },
  });

  void recordSettlementHistory({
    settlementId: id,
    action: "ITEM_ADDED",
    actorId: user.id,
    actorName: user.name,
    metadata: { itemType, amount, description } as Record<string, string | number>,
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
