import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/admin/reports — 관리자 신고 목록 (필터/페이지네이션) */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const targetType = url.searchParams.get("targetType");
  const reason = url.searchParams.get("reason");
  const search = url.searchParams.get("search");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")),
  );

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (priority) where.priority = priority;
  if (targetType) where.targetType = targetType;
  if (reason) where.reason = reason;
  if (search) where.description = { contains: search, mode: "insensitive" };

  const [reports, total, statusCounts] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    }),
    prisma.report.count({ where }),
    prisma.report.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const statusCountMap = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.status]),
  );

  return NextResponse.json({
    data: reports,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      statusCounts: statusCountMap,
    },
  });
}
