import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

export async function GET() {
    try {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = subMonths(currentMonthStart, 1);
        const lastMonthEnd = endOfMonth(lastMonthStart);

        // 1. 이번 달 총 정산 예상액
        const currentSettlements = await prisma.settlement.aggregate({
            where: { createdAt: { gte: currentMonthStart } },
            _sum: { totalAmount: true },
            _count: true,
        });
        const lastSettlements = await prisma.settlement.aggregate({
            where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
            _sum: { totalAmount: true },
            _count: true,
        });

        // 2. 이번 달 지급 완료 정산액
        const currentPaid = await prisma.settlement.aggregate({
            where: {
                createdAt: { gte: currentMonthStart },
                status: "COMPLETED",
            },
            _sum: { totalAmount: true },
        });
        const lastPaid = await prisma.settlement.aggregate({
            where: {
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
                status: "COMPLETED",
            },
            _sum: { totalAmount: true },
        });

        // 3. 평균 정산 단가
        const currentTotal = Number(currentSettlements._sum.totalAmount || 0);
        const lastTotal = Number(lastSettlements._sum.totalAmount || 0);
        const currentAvg = currentTotal / Math.max(currentSettlements._count, 1);
        const lastAvg = lastTotal / Math.max(lastSettlements._count, 1);

        // 4. 정산 건수
        const currentCount = currentSettlements._count;
        const lastCount = lastSettlements._count;

        const calculateTrend = (current: number, last: number) => {
            if (last === 0) return current > 0 ? 100 : 0;
            return Number((((current - last) / last) * 100).toFixed(1));
        };

        const data = [
            {
                title: "예상 정산 총액",
                value: currentTotal,
                trend: calculateTrend(currentTotal, lastTotal),
                prefix: "₩",
                suffix: "",
                icon: "wallet",
                isCurrency: true,
            },
            {
                title: "지급 완료액",
                value: Number(currentPaid._sum.totalAmount || 0),
                trend: calculateTrend(Number(currentPaid._sum.totalAmount || 0), Number(lastPaid._sum.totalAmount || 0)),
                prefix: "₩",
                suffix: "",
                icon: "check",
                isCurrency: true,
            },
            {
                title: "평균 정산 단가",
                value: Math.round(currentAvg),
                trend: calculateTrend(currentAvg, lastAvg),
                prefix: "₩",
                suffix: "",
                icon: "avg",
                isCurrency: true,
            },
            {
                title: "정산 건수",
                value: currentCount,
                trend: calculateTrend(currentCount, lastCount),
                prefix: "",
                suffix: "건",
                icon: "count",
                isCurrency: false,
            },
        ];

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching financial KPIs:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
