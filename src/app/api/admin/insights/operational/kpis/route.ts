import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const now = new Date();
        let from: Date;
        let to: Date;

        if (fromParam || toParam) {
            const parsedFrom = fromParam ? new Date(fromParam) : null;
            const parsedTo = toParam ? new Date(toParam) : null;

            if (
                (parsedFrom && isNaN(parsedFrom.getTime())) ||
                (parsedTo && isNaN(parsedTo.getTime()))
            ) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "유효하지 않은 날짜 형식입니다." } },
                    { status: 400 }
                );
            }

            from = parsedFrom ?? startOfMonth(now);
            to = parsedTo ?? now;

            if (from >= to) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "시작일은 종료일보다 이전이어야 합니다." } },
                    { status: 400 }
                );
            }

            const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 365) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "최대 365일 범위까지 조회할 수 있습니다." } },
                    { status: 400 }
                );
            }
        } else {
            from = startOfMonth(now);
            to = now;
        }

        // Previous period: same duration, immediately before
        const durationMs = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - durationMs);
        const prevTo = new Date(from.getTime() - 1);

        // Parallel fetch: all 8 queries for current + previous period
        const [currentProjects, prevProjects, currentVideos, prevVideos, recentFeedbacks, prevFeedbacks, currentActiveStars, prevActiveStars] = await Promise.all([
            // 1. 신규 프로젝트 (ProjectRequest) 수
            prisma.projectRequest.count({
                where: { createdAt: { gte: from, lte: to } },
            }),
            prisma.projectRequest.count({
                where: { createdAt: { gte: prevFrom, lte: prevTo } },
            }),
            // 2. 처리된 영상 (Submission with APPROVED or REJECTED status)
            prisma.submission.count({
                where: {
                    updatedAt: { gte: from, lte: to },
                    status: { in: ["APPROVED", "REJECTED"] },
                },
            }),
            prisma.submission.count({
                where: {
                    updatedAt: { gte: prevFrom, lte: prevTo },
                    status: { in: ["APPROVED", "REJECTED"] },
                },
            }),
            // 3. 피드백 응답 시간 (Feedback createdAt - Submission createdAt)
            prisma.feedback.findMany({
                where: { createdAt: { gte: from, lte: to } },
                select: { createdAt: true, submission: { select: { createdAt: true } } },
                take: 200,
            }),
            prisma.feedback.findMany({
                where: { createdAt: { gte: prevFrom, lte: prevTo } },
                select: { createdAt: true, submission: { select: { createdAt: true } } },
                take: 200,
            }),
            // 4. 활동 STAR (STARs who submitted at least 1 submission in the period)
            prisma.user.count({
                where: {
                    role: "STAR",
                    submissions: { some: { createdAt: { gte: from, lte: to } } },
                },
            }),
            prisma.user.count({
                where: {
                    role: "STAR",
                    submissions: { some: { createdAt: { gte: prevFrom, lte: prevTo } } },
                },
            }),
        ]);

        let currentAvgTime = 0;
        if (recentFeedbacks.length > 0) {
            const totalHours = recentFeedbacks.reduce((sum, fb) => {
                const diffMs = fb.createdAt.getTime() - fb.submission.createdAt.getTime();
                return sum + diffMs / (1000 * 60 * 60);
            }, 0);
            currentAvgTime = Number((totalHours / recentFeedbacks.length).toFixed(1));
        }

        let prevAvgTime = 0;
        if (prevFeedbacks.length > 0) {
            const totalHours = prevFeedbacks.reduce((sum, fb) => {
                const diffMs = fb.createdAt.getTime() - fb.submission.createdAt.getTime();
                return sum + diffMs / (1000 * 60 * 60);
            }, 0);
            prevAvgTime = Number((totalHours / prevFeedbacks.length).toFixed(1));
        }

        const calculateTrend = (current: number, last: number) => {
            if (last === 0) return current > 0 ? 100 : 0;
            return Number((((current - last) / last) * 100).toFixed(1));
        };

        const data = [
            {
                title: "신규 프로젝트",
                value: currentProjects,
                trend: calculateTrend(currentProjects, prevProjects),
                prefix: "",
                suffix: "건",
                icon: "project",
                description: "현재 기간 동안 새롭게 접수된 프로젝트 요청 건수",
            },
            {
                title: "처리된 영상",
                value: currentVideos,
                trend: calculateTrend(currentVideos, prevVideos),
                prefix: "",
                suffix: "건",
                icon: "video",
                description: "현재 기간 동안 승인 또는 반려 처리 완료된 영상 건수",
            },
            {
                title: "피드백 응답 시간",
                value: currentAvgTime,
                trend: calculateTrend(prevAvgTime, currentAvgTime), // Reversed: faster = positive
                prefix: "",
                suffix: "시간",
                icon: "clock",
                description: "제출물 업로드 후 리뷰어가 피드백을 작성하기까지 걸린 평균 시간",
            },
            {
                title: "활동 STAR",
                value: currentActiveStars,
                trend: calculateTrend(currentActiveStars, prevActiveStars),
                prefix: "",
                suffix: "명",
                icon: "user",
                description: "현재 기간 동안 영상을 1건 이상 제출한 STAR 인원 수",
            },
        ];

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching operational KPIs:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
