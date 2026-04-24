import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));
  const search = searchParams.get("search")?.trim();
  const approvedFilter = searchParams.get("approved"); // "true" | "false" | null (all)
  const roleFilter = searchParams.get("role"); // "ADMIN" | "STAR" | null (all)

  const where: Record<string, unknown> = {};

  if (approvedFilter === "true") {
    where.isApproved = true;
  } else if (approvedFilter === "false") {
    where.isApproved = false;
  }

  if (roleFilter === "ADMIN" || roleFilter === "STAR") {
    where.role = roleFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { chineseName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total, statsGroups] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        chineseName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isApproved: true,
        createdAt: true,
        idNumber: true,
        bankName: true,
        bankAccount: true,
        canDirectUpload: true,
        showVideosPublicly: true,
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({
      by: ["role", "isApproved"],
      _count: { id: true },
    }),
  ]);

  // 필터 무관 전체 통계 계산
  const stats = { total: 0, adminCount: 0, starCount: 0, pendingCount: 0, approvedCount: 0 };
  for (const g of statsGroups) {
    const count = g._count.id;
    stats.total += count;
    if (g.role === "ADMIN") stats.adminCount += count;
    if (g.role === "STAR") stats.starCount += count;
    if (g.isApproved) stats.approvedCount += count;
    else stats.pendingCount += count;
  }

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    stats,
  });
}
