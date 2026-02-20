import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { maskIdNumber } from "@/lib/settlement-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const settlement = await prisma.settlement.findUnique({
    where: { id },
    include: {
      star: { select: { id: true, name: true, email: true, baseRate: true, idNumber: true, bankName: true, bankAccount: true } },
      items: {
        include: {
          submission: {
            select: {
              id: true,
              versionTitle: true,
              version: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // STAR는 본인 정산만 조회 가능
  if (user.role === "STAR" && settlement.starId !== user.id) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "본인 정산만 조회할 수 있습니다." } },
      { status: 403 }
    );
  }

  const responseData = {
    ...settlement,
    star: {
      ...settlement.star,
      idNumber: settlement.star.idNumber ? maskIdNumber(settlement.star.idNumber) : null,
    },
  };

  return NextResponse.json({ data: responseData });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 정산을 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

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

  if (settlement.status === SettlementStatus.COMPLETED) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "확정된 정산은 삭제할 수 없습니다." } },
      { status: 403 }
    );
  }

  // 아이템 먼저 삭제 후 정산 삭제
  await prisma.settlementItem.deleteMany({ where: { settlementId: id } });
  await prisma.settlement.delete({ where: { id } });

  return NextResponse.json({ message: "정산이 삭제되었습니다." });
}

const updateSettlementSchema = z.object({
  paymentDate: z.string().datetime().optional().nullable(),
  note: z.string().optional().nullable(),
});

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
      { error: { code: "FORBIDDEN", message: "관리자만 정산을 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = updateSettlementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  const settlement = await prisma.settlement.findUnique({ where: { id } });
  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: {
      ...(parsed.data.paymentDate !== undefined
        ? { paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : null }
        : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
