import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { z } from "zod";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "폴더 이름을 입력해주세요.").max(50, "폴더 이름은 50자 이하로 입력해주세요."),
  description: z.string().trim().max(200).optional(),
});

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const withStats = searchParams.get("stats") !== "false";

  const folders = await prisma.settlementFolder.findMany({
    orderBy: { createdAt: "desc" },
    include: withStats
      ? {
          _count: { select: { settlements: true } },
          settlements: {
            select: { totalAmount: true, netAmount: true, taxAmount: true },
          },
        }
      : undefined,
  });

  const data = folders.map((f) => {
    if (!withStats || !("settlements" in f)) return { id: f.id, name: f.name, description: f.description, createdAt: f.createdAt };
    const count = (f as typeof f & { _count: { settlements: number } })._count.settlements;
    const setts = (f as typeof f & { settlements: { totalAmount: unknown; netAmount: unknown; taxAmount: unknown }[] }).settlements;
    const totalAmount = setts.reduce((s, r) => s + Number(r.totalAmount), 0);
    const netAmount = setts.reduce((s, r) => s + Number(r.netAmount), 0);
    const taxAmount = setts.reduce((s, r) => s + Number(r.taxAmount), 0);
    return { id: f.id, name: f.name, description: f.description, createdAt: f.createdAt, count, totalAmount, netAmount, taxAmount };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN", message: "권한이 없습니다." } }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "BAD_REQUEST", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } }, { status: 400 });

  const folder = await prisma.settlementFolder.create({
    data: { name: parsed.data.name, description: parsed.data.description, createdBy: user.id },
  });

  return NextResponse.json({ data: folder }, { status: 201 });
}
