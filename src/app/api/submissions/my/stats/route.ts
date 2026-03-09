import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/submissions/my/stats
 * STAR 대시보드 KPI: 진행 중 프로젝트, 미확인 피드백, 최근 정산, 마감 임박 제작요청
 */
export async function GET() {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [
        activeProjects,
        unreadFeedbackCount,
        latestSettlement,
        upcomingDeadlines,
        submissionStats,
    ] = await Promise.all([
        // 1. 진행 중 프로젝트 수
        prisma.projectAssignment.count({
            where: {
                starId: user.id,
                status: { in: ["ACCEPTED", "IN_PROGRESS", "SUBMITTED"] },
            },
        }),

        // 2. 미확인 피드백 수
        prisma.feedback.count({
            where: {
                submission: { starId: user.id },
                seenByStarAt: null,
            },
        }),

        // 3. 최근 정산
        prisma.settlement.findFirst({
            where: { starId: user.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                totalAmount: true,
                status: true,
                startDate: true,
                endDate: true,
            },
        }),

        // 4. 마감 임박 프로젝트 (3일 이내)
        prisma.projectAssignment.findMany({
            where: {
                starId: user.id,
                status: { in: ["ACCEPTED", "IN_PROGRESS"] },
                request: {
                    deadline: { lte: threeDaysLater, gte: now },
                },
            },
            select: {
                id: true,
                request: {
                    select: { id: true, title: true, deadline: true },
                },
            },
            take: 5,
            orderBy: { request: { deadline: "asc" } },
        }),

        // 5. 제출물 상태별 카운트
        prisma.submission.groupBy({
            by: ["status"],
            where: { starId: user.id },
            _count: true,
        }),
    ]);

    // 제출물 상태 맵핑
    const statusCounts: Record<string, number> = {};
    for (const item of submissionStats) {
        statusCounts[item.status] = item._count;
    }

    return NextResponse.json({
        data: {
            activeProjects,
            unreadFeedbackCount,
            latestSettlement: latestSettlement
                ? {
                    id: latestSettlement.id,
                    amount: Number(latestSettlement.totalAmount),
                    status: latestSettlement.status,
                    period: `${latestSettlement.startDate.toISOString().slice(0, 7)}`,
                }
                : null,
            upcomingDeadlines: upcomingDeadlines.map((a) => ({
                assignmentId: a.id,
                requestId: a.request.id,
                title: a.request.title,
                deadline: a.request.deadline.toISOString(),
                daysLeft: Math.ceil(
                    (a.request.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                ),
            })),
            submissionCounts: {
                pending: statusCounts["PENDING"] ?? 0,
                inReview: statusCounts["IN_REVIEW"] ?? 0,
                approved: statusCounts["APPROVED"] ?? 0,
                rejected: statusCounts["REJECTED"] ?? 0,
                revised: statusCounts["REVISED"] ?? 0,
            },
        },
    });
}
