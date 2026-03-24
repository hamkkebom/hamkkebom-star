import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/settlements/analytics
 *
 * 정산 분석 데이터를 반환합니다.
 * Query: period=12 (최근 N개월, 기본 12)
 */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근 가능합니다." } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const period = Math.min(24, Math.max(1, Number(searchParams.get("period") ?? "12") || 12));

  // 기간 범위 계산
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - period + 1, 1);

  // 1. 기간 내 모든 정산 조회
  const settlements = await prisma.settlement.findMany({
    where: {
      startDate: { gte: startMonth },
    },
    include: {
      star: { select: { id: true, name: true } },
      items: { select: { itemType: true, finalAmount: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // 2. 월별 추이 집계
  const monthlyMap = new Map<string, {
    month: string;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
    count: number;
    starIds: Set<string>;
  }>();

  for (const s of settlements) {
    const key = `${s.startDate.getFullYear()}-${String(s.startDate.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthlyMap.get(key) || {
      month: key,
      totalAmount: 0,
      taxAmount: 0,
      netAmount: 0,
      count: 0,
      starIds: new Set<string>(),
    };
    existing.totalAmount += Number(s.totalAmount);
    existing.taxAmount += Number(s.taxAmount);
    existing.netAmount += Number(s.netAmount);
    existing.count += 1;
    existing.starIds.add(s.starId);
    monthlyMap.set(key, existing);
  }

  const monthlyTrend = Array.from(monthlyMap.values()).map((m) => ({
    month: m.month,
    totalAmount: m.totalAmount,
    taxAmount: m.taxAmount,
    netAmount: m.netAmount,
    count: m.count,
    starCount: m.starIds.size,
  }));

  // 3. STAR별 분포 (전체 기간)
  const starMap = new Map<string, { starId: string; starName: string; totalAmount: number }>();
  for (const s of settlements) {
    const existing = starMap.get(s.starId) || {
      starId: s.starId,
      starName: s.star.name,
      totalAmount: 0,
    };
    existing.totalAmount += Number(s.totalAmount);
    starMap.set(s.starId, existing);
  }

  const grandTotal = Array.from(starMap.values()).reduce((s, v) => s + v.totalAmount, 0);
  const starDistribution = Array.from(starMap.values())
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((s) => ({
      starId: s.starId,
      starName: s.starName,
      totalAmount: s.totalAmount,
      percentage: grandTotal > 0 ? Math.round((s.totalAmount / grandTotal) * 1000) / 10 : 0,
    }));

  // 4. KPI 요약 (현재월 vs 전월)
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const current = monthlyMap.get(currentMonthKey);
  const previous = monthlyMap.get(prevMonthKey);

  const currentTotal = current?.totalAmount ?? 0;
  const previousTotal = previous?.totalAmount ?? 0;
  const changeRate = previousTotal > 0
    ? Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10
    : 0;

  const totalItems = settlements.reduce((s, v) => s + v.items.length, 0);
  const totalStars = new Set(settlements.map((s) => s.starId)).size;

  // 5. 항목 유형별 분포
  const itemTypeMap = new Map<string, { totalAmount: number; count: number }>();
  for (const s of settlements) {
    for (const item of s.items) {
      const existing = itemTypeMap.get(item.itemType) || { totalAmount: 0, count: 0 };
      existing.totalAmount += Number(item.finalAmount);
      existing.count += 1;
      itemTypeMap.set(item.itemType, existing);
    }
  }

  const itemTypeDistribution = Array.from(itemTypeMap.entries()).map(([type, data]) => ({
    itemType: type,
    totalAmount: data.totalAmount,
    count: data.count,
  }));

  // 6. 상태별 집계
  const statusCounts = {
    PENDING: 0,
    REVIEW: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };
  for (const s of settlements) {
    if (s.status in statusCounts) {
      statusCounts[s.status as keyof typeof statusCounts] += 1;
    }
  }

  return NextResponse.json({
    data: {
      monthlyTrend,
      starDistribution,
      summary: {
        currentMonth: {
          total: currentTotal,
          tax: current?.taxAmount ?? 0,
          net: current?.netAmount ?? 0,
          count: current?.count ?? 0,
        },
        previousMonth: {
          total: previousTotal,
          tax: previous?.taxAmount ?? 0,
          net: previous?.netAmount ?? 0,
          count: previous?.count ?? 0,
        },
        changeRate,
        avgPerItem: totalItems > 0 ? Math.round(grandTotal / totalItems) : 0,
        avgPerStar: totalStars > 0 ? Math.round(grandTotal / totalStars) : 0,
      },
      itemTypeDistribution,
      statusCounts,
    },
  });
}
