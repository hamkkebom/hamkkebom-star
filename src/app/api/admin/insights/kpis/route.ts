import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // 1. 영상 제출/접수 등
        const currentVideos = await prisma.submission.count({
            where: { createdAt: { gte: thirtyDaysAgo } }
        });
        const previousVideos = await prisma.submission.count({
            where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
        });

        // 2. 누적 정산 (최근 30일)
        const currentSettlements = await prisma.settlement.aggregate({
            where: { startDate: { gte: thirtyDaysAgo } },
            _sum: { totalAmount: true }
        });
        const previousSettlements = await prisma.settlement.aggregate({
            where: { startDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
            _sum: { totalAmount: true }
        });

        // 3. 최근 활동 STAR수 (최근 30일간 가입 혹은 영상제출을 한 STAR 등 활용)
        // 단순화하여 전체 STAR 증감수
        const currentStars = await prisma.user.count({
            where: { role: "STAR", createdAt: { gte: thirtyDaysAgo } }
        });
        const previousStars = await prisma.user.count({
            where: { role: "STAR", createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
        });

        // 4. 평균 처리 시간 (단순 계산)
        const recentApproved = await prisma.submission.findMany({
            where: { status: "APPROVED", updatedAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true, updatedAt: true },
            take: 100 // 샘플 최신 100건
        });
        let avgDays = 0;
        if (recentApproved.length > 0) {
            const sum = recentApproved.reduce((acc, sub) => acc + (sub.updatedAt.getTime() - sub.createdAt.getTime()), 0);
            avgDays = sum / recentApproved.length / (1000 * 60 * 60 * 24);
        }

        const prevApproved = await prisma.submission.findMany({
            where: { status: "APPROVED", updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
            select: { createdAt: true, updatedAt: true },
            take: 100
        });
        let prevAvgDays = 0;
        if (prevApproved.length > 0) {
            const sum = prevApproved.reduce((acc, sub) => acc + (sub.updatedAt.getTime() - sub.createdAt.getTime()), 0);
            prevAvgDays = sum / prevApproved.length / (1000 * 60 * 60 * 24);
        }

        const calcTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Number((((curr - prev) / prev) * 100).toFixed(1));
        };

        return NextResponse.json({
            monthlyVideos: {
                current: currentVideos,
                previous: previousVideos,
                trend: calcTrend(currentVideos, previousVideos)
            },
            monthlySettlement: {
                current: Number(currentSettlements._sum.totalAmount || 0),
                previous: Number(previousSettlements._sum.totalAmount || 0),
                trend: calcTrend(Number(currentSettlements._sum.totalAmount || 0), Number(previousSettlements._sum.totalAmount || 0))
            },
            activeStars: {
                current: currentStars,
                previous: previousStars,
                trend: calcTrend(currentStars, previousStars)
            },
            avgFeedbackDays: {
                current: Number(avgDays.toFixed(1)),
                previous: Number(prevAvgDays.toFixed(1)),
                trend: prevAvgDays > 0 ? Number((((avgDays - prevAvgDays) / prevAvgDays) * 100).toFixed(1)) : 0
            }
        });

    } catch (error) {
        console.error("KPI API Error:", error);
        return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
    }
}
