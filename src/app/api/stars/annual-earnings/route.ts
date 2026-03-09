import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/stars/annual-earnings
 *
 * 최근 12개월간 월별 정산 합산 데이터를 반환합니다.
 * 응답: { data: [{ month: "2026-01", amount: 500000, count: 5 }, ...], summary: { total, average, best } }
 */
export async function GET() {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    if (user.role !== "STAR") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "STAR만 접근할 수 있습니다." } },
            { status: 403 }
        );
    }

    // 최근 12개월 범위
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const settlements = await prisma.settlement.findMany({
        where: {
            starId: user.id,
            startDate: { gte: startDate },
        },
        select: {
            startDate: true,
            totalAmount: true,
            status: true,
            _count: { select: { items: true } },
        },
        orderBy: { startDate: "asc" },
    });

    // 월별 그룹화
    const monthlyMap: Record<string, { amount: number; count: number }> = {};

    // 12개월 슬롯 초기화
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { amount: 0, count: 0 };
    }

    for (const s of settlements) {
        const d = new Date(s.startDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key]) {
            monthlyMap[key].amount += Number(s.totalAmount);
            monthlyMap[key].count += s._count.items;
        }
    }

    const data = Object.entries(monthlyMap).map(([month, v]) => ({
        month,
        amount: Math.round(v.amount),
        count: v.count,
    }));

    const total = data.reduce((s, d) => s + d.amount, 0);
    const nonZero = data.filter((d) => d.amount > 0);
    const average = nonZero.length > 0 ? Math.round(total / nonZero.length) : 0;
    const best = data.reduce((max, d) => (d.amount > max.amount ? d : max), data[0]);

    return NextResponse.json({
        data,
        summary: {
            total,
            average,
            bestMonth: best?.month ?? null,
            bestAmount: best?.amount ?? 0,
        },
    });
}
