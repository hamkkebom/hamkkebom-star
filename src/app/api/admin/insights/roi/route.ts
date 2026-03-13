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
        const dateFilter = from && to ? { gte: new Date(from), lte: new Date(to) } : undefined;

        // 프로젝트별 데이터
        const projects = await prisma.projectRequest.findMany({
            where: dateFilter ? { createdAt: dateFilter } : {},
            take: 200,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                categories: true,
                deadline: true,
                assignments: {
                    select: {
                        submissions: {
                            select: {
                                id: true,
                                status: true,
                                settlementItem: {
                                    select: { finalAmount: true },
                                },
                                aiAnalysis: {
                                    select: { scores: true, status: true },
                                },
                                star: {
                                    select: {
                                        grade: { select: { name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // 프로젝트별 ROI 계산
        const projectROIs = projects.map((project) => {
            const allSubs = project.assignments.flatMap((a) => a.submissions);
            const totalCost = allSubs.reduce((sum, s) => {
                return sum + Number(s.settlementItem?.finalAmount ?? 0);
            }, 0);
            const approvedCount = allSubs.filter((s) => s.status === "APPROVED").length;
            const totalSubmissions = allSubs.length;

            const qualityScores = allSubs
                .filter((s) => s.aiAnalysis?.status === "COMPLETED")
                .map((s) => {
                    const scores = s.aiAnalysis!.scores as Record<string, number>;
                    return scores.overall ?? 0;
                })
                .filter((v) => v > 0);

            const avgQualityScore = qualityScores.length > 0
                ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 10) / 10
                : 0;

            const costPerApproved = approvedCount > 0 ? Math.round(totalCost / approvedCount) : 0;
            const roi = totalCost > 0 ? Math.round((approvedCount / (totalCost / 60000)) * 100) / 100 : 0;

            return {
                requestId: project.id,
                title: project.title,
                categories: project.categories,
                totalCost,
                approvedCount,
                totalSubmissions,
                avgQualityScore,
                costPerApproved,
                roi,
            };
        });

        // 카테고리별 ROI
        const categoryMap: Record<string, { cost: number; approved: number; total: number }> = {};
        projectROIs.forEach((p) => {
            const cats = p.categories.length > 0 ? p.categories : ["미분류"];
            cats.forEach((cat) => {
                if (!categoryMap[cat]) categoryMap[cat] = { cost: 0, approved: 0, total: 0 };
                categoryMap[cat].cost += p.totalCost;
                categoryMap[cat].approved += p.approvedCount;
                categoryMap[cat].total += p.totalSubmissions;
            });
        });

        const byCategory = Object.entries(categoryMap)
            .map(([category, data]) => ({
                category,
                ...data,
                costPerApproved: data.approved > 0 ? Math.round(data.cost / data.approved) : 0,
                approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 1000) / 10 : 0,
            }))
            .sort((a, b) => b.cost - a.cost);

        // 등급별 ROI
        const gradeMap: Record<string, { cost: number; approved: number; total: number }> = {};
        for (const project of projects) {
            for (const assignment of project.assignments) {
                for (const sub of assignment.submissions) {
                    const grade = sub.star?.grade?.name ?? "미배정";
                    if (!gradeMap[grade]) gradeMap[grade] = { cost: 0, approved: 0, total: 0 };
                    gradeMap[grade].cost += Number(sub.settlementItem?.finalAmount ?? 0);
                    gradeMap[grade].total += 1;
                    if (sub.status === "APPROVED") gradeMap[grade].approved += 1;
                }
            }
        }

        const byGrade = Object.entries(gradeMap)
            .map(([grade, data]) => ({
                grade,
                ...data,
                costPerApproved: data.approved > 0 ? Math.round(data.cost / data.approved) : 0,
                approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 1000) / 10 : 0,
            }))
            .sort((a, b) => b.cost - a.cost);

        // 월별 비용 추이
        const monthlyMap: Record<string, { cost: number; approved: number }> = {};
        for (const project of projects) {
            for (const assignment of project.assignments) {
                for (const sub of assignment.submissions) {
                    if (sub.settlementItem) {
                        const month = new Date(project.deadline).toISOString().slice(0, 7);
                        if (!monthlyMap[month]) monthlyMap[month] = { cost: 0, approved: 0 };
                        monthlyMap[month].cost += Number(sub.settlementItem.finalAmount);
                        if (sub.status === "APPROVED") monthlyMap[month].approved += 1;
                    }
                }
            }
        }
        const monthlyTrend = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, ...data }));

        // 전체 요약
        const totalCost = projectROIs.reduce((s, p) => s + p.totalCost, 0);
        const totalApproved = projectROIs.reduce((s, p) => s + p.approvedCount, 0);

        return NextResponse.json({
            projects: projectROIs.sort((a, b) => b.totalCost - a.totalCost).slice(0, 30),
            byCategory,
            byGrade,
            monthlyTrend,
            summary: {
                totalCost,
                totalApproved,
                avgCostPerApproved: totalApproved > 0 ? Math.round(totalCost / totalApproved) : 0,
                totalProjects: projects.length,
            },
        });
    } catch (error) {
        console.error("[insights/roi]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
