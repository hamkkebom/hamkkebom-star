import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { maskIdNumber } from "@/lib/settlement-utils";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

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
      star: { select: { id: true, name: true, chineseName: true, email: true, phone: true, baseRate: true, idNumber: true, bankName: true, bankAccount: true, aiToolSupportFee: true } },
      items: {
        include: {
          submission: {
            select: {
              id: true,
              versionTitle: true,
              version: true,
              status: true,
              createdAt: true,
              video: {
                select: {
                  id: true,
                  title: true,
                  customRate: true,
                  thumbnailPhash: true,
                  audioPhash: true,
                  streamUid: true,
                },
              },
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
    select: { id: true, status: true, archivedAt: true },
  });

  if (!settlement) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 활성(미아카이브) 상태에서 확정된 정산은 송금이 진행 중이므로 보호.
  // 아카이브된 정산은 어드민이 의도적으로 정리/재생성 하려는 케이스로, 확정 여부와 무관하게 삭제 허용.
  if (settlement.status === SettlementStatus.COMPLETED && !settlement.archivedAt) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "확정된 정산은 삭제할 수 없습니다. (아카이브로 이동된 정산만 삭제 가능)" } },
      { status: 403 }
    );
  }

  // 아이템 먼저 삭제 후 정산 삭제
  await prisma.settlementItem.deleteMany({ where: { settlementId: id } });
  await prisma.settlement.delete({ where: { id } });

  void createAuditLog({
    actorId: user.id,
    action: "DELETE_SETTLEMENT",
    entityType: "Settlement",
    entityId: id,
  });

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
