import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const starId = searchParams.get("starId");

        const dateFilter = from && to ? { gte: new Date(from), lte: new Date(to) } : undefined;

        // 모든 STAR + 제출물 + AI분석 + 피드백 가져오기
        const stars = await prisma.user.findMany({
            where: {
                role: "STAR",
                isApproved: true,
                ...(starId ? { id: starId } : {}),
            },
            select: {
                id: true,
                name: true,
                avatarUrl: true,
                grade: { select: { name: true, color: true } },
                submissions: {
                    where: dateFilter ? { createdAt: dateFilter } : {},
                    select: {
                        id: true,
                        status: true,
                        version: true,
                        submittedAt: true,
                        approvedAt: true,
                        parentId: true,
                        assignment: {
                            select: {
                                request: { select: { deadline: true } },
                            },
                        },
                        feedbacks: {
                            select: {
                                id: true,
                                resolvedByStar: true,
                            },
                        },
                        aiAnalysis: {
                            select: {
                                scores: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        const starMetrics = stars.map((star) => {
            const subs = star.submissions;
            const totalSubmissions = subs.length;

            // 1. 납기 준수율: submittedAt <= deadline
            const subsWithDeadline = subs.filter(
                (s) => s.submittedAt && s.assignment?.request?.deadline
            );
            const onTime = subsWithDeadline.filter(
                (s) => new Date(s.submittedAt!) <= new Date(s.assignment!.request.deadline)
            ).length;
            const deadlineRate = subsWithDeadline.length > 0
                ? Math.round((onTime / subsWithDeadline.length) * 1000) / 10
                : 0;

            // 2. 피드백 반영률
            const allFeedbacks = subs.flatMap((s) => s.feedbacks);
            const resolvedFeedbacks = allFeedbacks.filter((f) => f.resolvedByStar);
            const feedbackRate = allFeedbacks.length > 0
                ? Math.round((resolvedFeedbacks.length / allFeedbacks.length) * 1000) / 10
                : 0;

            // 3. 품질 점수 (AiAnalysis.scores.overall 평균)
            const qualityScores = subs
                .filter((s) => s.aiAnalysis?.status === "COMPLETED" && s.aiAnalysis.scores)
                .map((s) => {
                    const scores = s.aiAnalysis!.scores as Record<string, number>;
                    return scores.overall ?? 0;
                })
                .filter((v) => v > 0);
            const qualityScore = qualityScores.length > 0
                ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 10) / 10
                : 0;

            // 4. 1차 승인률 (v1.0 APPROVED)
            const v1Subs = subs.filter((s) => !s.parentId); // 원본 제출물
            const v1Approved = v1Subs.filter((s) => s.status === "APPROVED").length;
            const firstApprovalRate = v1Subs.length > 0
                ? Math.round((v1Approved / v1Subs.length) * 1000) / 10
                : 0;

            // 5. 평균 수정 횟수
            const revisedSubs = subs.filter((s) => s.parentId);
            const avgRevisions = totalSubmissions > 0
                ? Math.round((revisedSubs.length / Math.max(v1Subs.length, 1)) * 10) / 10
                : 0;

            const totalApproved = subs.filter((s) => s.status === "APPROVED").length;

            return {
                id: star.id,
                name: star.name,
                avatarUrl: star.avatarUrl,
                grade: star.grade?.name ?? "미배정",
                gradeColor: star.grade?.color ?? "slate",
                metrics: {
                    deadlineRate,
                    feedbackRate,
                    qualityScore,
                    firstApprovalRate,
                    avgRevisions,
                    totalSubmissions,
                    totalApproved,
                },
            };
        });

        // 전체 평균
        const allMetrics = starMetrics.filter((s) => s.metrics.totalSubmissions > 0);
        const avg = (arr: number[]) =>
            arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

        const overall = {
            deadlineRate: avg(allMetrics.map((s) => s.metrics.deadlineRate)),
            feedbackRate: avg(allMetrics.map((s) => s.metrics.feedbackRate)),
            qualityScore: avg(allMetrics.map((s) => s.metrics.qualityScore)),
            firstApprovalRate: avg(allMetrics.map((s) => s.metrics.firstApprovalRate)),
            avgRevisions: avg(allMetrics.map((s) => s.metrics.avgRevisions)),
        };

        // 제출물 수 기준 내림차순 정렬
        starMetrics.sort((a, b) => b.metrics.totalSubmissions - a.metrics.totalSubmissions);

        return NextResponse.json({ stars: starMetrics, overall });
    } catch (error) {
        console.error("[insights/scorecard]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
