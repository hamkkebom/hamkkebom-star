import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = subMonths(currentMonthStart, 1);
        const lastMonthEnd = endOfMonth(lastMonthStart);

        // 1. 신규 프로젝트 (ProjectRequest) 수
        const currentProjects = await prisma.projectRequest.count({
            where: { createdAt: { gte: currentMonthStart } },
        });
        const lastProjects = await prisma.projectRequest.count({
            where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        });

        // 2. 처리된 영상 (Submission with APPROVED status)
        const currentVideos = await prisma.submission.count({
            where: {
                updatedAt: { gte: currentMonthStart },
                status: { in: ["APPROVED", "REJECTED"] },
            },
        });
        const lastVideos = await prisma.submission.count({
            where: {
                updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
                status: { in: ["APPROVED", "REJECTED"] },
            },
        });

        // 3. 평균 피드백 소요 시간 (Feedback createdAt - Submission createdAt)
        const recentFeedbacks = await prisma.feedback.findMany({
            where: { createdAt: { gte: currentMonthStart } },
            select: { createdAt: true, submission: { select: { createdAt: true } } },
            take: 200,
        });

        let currentAvgTime = 0;
        if (recentFeedbacks.length > 0) {
            const totalHours = recentFeedbacks.reduce((sum, fb) => {
                const diffMs = fb.createdAt.getTime() - fb.submission.createdAt.getTime();
                return sum + diffMs / (1000 * 60 * 60);
            }, 0);
            currentAvgTime = Number((totalHours / recentFeedbacks.length).toFixed(1));
        }

        const lastFeedbacks = await prisma.feedback.findMany({
            where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
            select: { createdAt: true, submission: { select: { createdAt: true } } },
            take: 200,
        });

        let lastAvgTime = 0;
        if (lastFeedbacks.length > 0) {
            const totalHours = lastFeedbacks.reduce((sum, fb) => {
                const diffMs = fb.createdAt.getTime() - fb.submission.createdAt.getTime();
                return sum + diffMs / (1000 * 60 * 60);
            }, 0);
            lastAvgTime = Number((totalHours / lastFeedbacks.length).toFixed(1));
        }

        // 4. 활동 STAR (Users who authored feedbacks this month)
        const currentActiveStars = await prisma.user.count({
            where: {
                role: "STAR",
                feedbacks: {
                    some: { createdAt: { gte: currentMonthStart } },
                },
            },
        });
        const lastActiveStars = await prisma.user.count({
            where: {
                role: "STAR",
                feedbacks: {
                    some: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
                },
            },
        });

        const calculateTrend = (current: number, last: number) => {
            if (last === 0) return current > 0 ? 100 : 0;
            return Number((((current - last) / last) * 100).toFixed(1));
        };

        const data = [
            {
                title: "신규 프로젝트",
                value: currentProjects,
                trend: calculateTrend(currentProjects, lastProjects),
                prefix: "",
                suffix: "건",
                icon: "project",
            },
            {
                title: "처리된 영상",
                value: currentVideos,
                trend: calculateTrend(currentVideos, lastVideos),
                prefix: "",
                suffix: "건",
                icon: "video",
            },
            {
                title: "평균 소요 시간",
                value: currentAvgTime,
                trend: calculateTrend(lastAvgTime, currentAvgTime), // Reversed: faster = positive
                prefix: "",
                suffix: "시간",
                icon: "clock",
            },
            {
                title: "활동 STAR",
                value: currentActiveStars,
                trend: calculateTrend(currentActiveStars, lastActiveStars),
                prefix: "",
                suffix: "명",
                icon: "user",
            },
        ];

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching operational KPIs:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
