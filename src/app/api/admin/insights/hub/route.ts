import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        const [
            totalStars,
            totalSubmissions,
            recentSubmissions,
            approvedSubmissions,
            totalSettlementAmount,
            aiAnalysisCount,
            avgQualityResult,
        ] = await Promise.all([
            // 활동 STAR 수
            prisma.user.count({ where: { role: "STAR", isApproved: true } }),
            // 총 제출물
            prisma.submission.count(),
            // 최근 30일 제출물
            prisma.submission.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            // 승인된 제출물
            prisma.submission.count({ where: { status: "APPROVED" } }),
            // 총 정산 금액
            prisma.settlement.aggregate({
                _sum: { totalAmount: true },
                where: { status: "COMPLETED" },
            }),
            // AI 분석 개수
            prisma.aiAnalysis.count({ where: { status: "COMPLETED" } }),
            // 평균 품질 점수 (raw query)
            prisma.$queryRaw<{ avg: number }[]>`
        SELECT AVG((scores->>'overall')::numeric) as avg
        FROM ai_analyses
        WHERE status = 'COMPLETED'
        AND scores->>'overall' IS NOT NULL
      `,
        ]);

        const avgQuality = avgQualityResult?.[0]?.avg
            ? Number(Number(avgQualityResult[0].avg).toFixed(1))
            : 0;

        return NextResponse.json({
            cards: [
                {
                    key: "scorecard",
                    title: "STAR 성과",
                    description: "납기 준수율, 품질 점수, 피드백 반영률",
                    icon: "Trophy",
                    value: totalStars,
                    suffix: "명",
                    color: "purple",
                    href: "/admin/insights/scorecard",
                },
                {
                    key: "roi",
                    title: "ROI 분석",
                    description: "투입 비용 대비 성과 분석",
                    icon: "BarChart3",
                    value: Number(totalSettlementAmount._sum.totalAmount ?? 0),
                    format: "currency",
                    color: "green",
                    href: "/admin/insights/roi",
                },
                {
                    key: "trends",
                    title: "트렌드",
                    description: "월별/분기별 콘텐츠 생산량 추이",
                    icon: "TrendingUp",
                    value: recentSubmissions,
                    suffix: "건 (30일)",
                    color: "blue",
                    href: "/admin/insights/trends",
                },
                {
                    key: "ai-quality",
                    title: "AI 품질",
                    description: "Gemini 기반 영상 품질 자동 평가",
                    icon: "Sparkles",
                    value: avgQuality,
                    suffix: "점",
                    color: "pink",
                    href: "/admin/insights/ai-quality",
                },
                {
                    key: "financial",
                    title: "재무 분석",
                    description: "정산 내역, 수익 추이, TOP STAR",
                    icon: "Wallet",
                    value: approvedSubmissions,
                    suffix: "건 승인",
                    color: "amber",
                    href: "/admin/insights/financial",
                },
                {
                    key: "operational",
                    title: "운영 효율",
                    description: "리뷰 속도, 처리 현황, 병목 분석",
                    icon: "Zap",
                    value: totalSubmissions,
                    suffix: "건 총계",
                    color: "red",
                    href: "/admin/insights/operational",
                },
            ],
        });
    } catch (error) {
        console.error("[insights/hub]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
