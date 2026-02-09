import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

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

  let body: { adjustedAmount?: number; finalAmount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
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

  const updated = await prisma.settlementItem.update({
    where: { id: itemId },
    data: {
      adjustedAmount: body.adjustedAmount ?? undefined,
      finalAmount: body.finalAmount ?? body.adjustedAmount ?? undefined,
    },
  });

  // 정산 총액 재계산
  const allItems = await prisma.settlementItem.findMany({
    where: { settlementId: id },
    select: { finalAmount: true },
  });

  const totalAmount = allItems.reduce(
    (sum, i) => sum + Number(i.finalAmount),
    0
  );

  await prisma.settlement.update({
    where: { id },
    data: { totalAmount },
  });

  return NextResponse.json({ data: { ...updated, newTotalAmount: totalAmount } });
}
