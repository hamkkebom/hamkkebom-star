import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { z } from "zod";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const renameSchema = z.object({
  name: z.string().trim().min(1, "폴더 이름을 입력해주세요.").max(50, "폴더 이름은 50자 이하로 입력해주세요."),
  description: z.string().trim().max(200).optional().nullable(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } }, { status: 400 }); }

  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } }, { status: 400 });

  const existing = await prisma.settlementFolder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND", message: "폴더를 찾을 수 없습니다." } }, { status: 404 });

  const updated = await prisma.settlementFolder.update({
    where: { id },
    data: { name: parsed.data.name, description: parsed.data.description ?? null },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 });

  const { id } = await params;
  // ?cascade=false 일 때만 정산을 보존하고 미분류로 이동. 기본은 폴더와 안의 정산까지 함께 삭제.
  const url = new URL(request.url);
  const cascade = url.searchParams.get("cascade") !== "false";

  const existing = await prisma.settlementFolder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: { code: "NOT_FOUND", message: "폴더를 찾을 수 없습니다." } }, { status: 404 });

  // 폴더 안의 정산 ID 수집
  const settlementsInFolder = await prisma.settlementFolder
    .findUnique({ where: { id }, include: { settlements: { select: { id: true } } } });
  const innerIds = settlementsInFolder?.settlements.map((s) => s.id) ?? [];

  let deletedSettlementCount = 0;
  if (cascade && innerIds.length > 0) {
    // 폴더는 아카이브 전용이므로 안의 정산도 함께 정리.
    // SettlementItem → Settlement 순으로 삭제 (FK cascade 가 있어도 명시적으로 정리).
    await prisma.settlementItem.deleteMany({ where: { settlementId: { in: innerIds } } });
    const res = await prisma.settlement.deleteMany({ where: { id: { in: innerIds } } });
    deletedSettlementCount = res.count;
  }

  await prisma.settlementFolder.delete({ where: { id } });

  return NextResponse.json({
    data: {
      id,
      deletedSettlementCount,
      cascadeMode: cascade ? "cascade" : "unfile",
    },
  });
}
