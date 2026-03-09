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
        const groupBy = searchParams.get("groupBy") || "month"; // month | quarter

        // 모든 제출물 + 카테고리 + STAR 정보
        const submissions = await prisma.submission.findMany({
            select: {
                id: true,
                status: true,
                createdAt: true,
                star: { select: { id: true, name: true } },
                assignment: {
                    select: {
                        request: { select: { categories: true } },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // 월별/분기별 그룹핑
        const periodMap: Record<string, {
            total: number;
            approved: number;
            categories: Record<string, number>;
            stars: Record<string, number>;
        }> = {};

        for (const sub of submissions) {
            const date = new Date(sub.createdAt);
            let periodKey: string;
            if (groupBy === "quarter") {
                const q = Math.ceil((date.getMonth() + 1) / 3);
                periodKey = `${date.getFullYear()}-Q${q}`;
            } else {
                periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            }

            if (!periodMap[periodKey]) {
                periodMap[periodKey] = { total: 0, approved: 0, categories: {}, stars: {} };
            }

            periodMap[periodKey].total += 1;
            if (sub.status === "APPROVED") periodMap[periodKey].approved += 1;

            // 카테고리별
            const cats = sub.assignment?.request?.categories ?? ["미분류"];
            cats.forEach((cat) => {
                periodMap[periodKey].categories[cat] = (periodMap[periodKey].categories[cat] || 0) + 1;
            });

            // STAR별
            if (sub.star) {
                periodMap[periodKey].stars[sub.star.name] = (periodMap[periodKey].stars[sub.star.name] || 0) + 1;
            }
        }

        const periods = Object.entries(periodMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period, data]) => ({
                period,
                total: data.total,
                approved: data.approved,
                approvalRate: data.total > 0 ? Math.round((data.approved / data.total) * 1000) / 10 : 0,
            }));

        // 카테고리별 월별 데이터 (스택 차트용)
        const allCategories = new Set<string>();
        for (const data of Object.values(periodMap)) {
            Object.keys(data.categories).forEach((c) => allCategories.add(c));
        }

        const categoryTrend = Object.entries(periodMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period, data]) => {
                const row: Record<string, string | number> = { period };
                allCategories.forEach((cat) => {
                    row[cat] = data.categories[cat] || 0;
                });
                return row;
            });

        // STAR별 월별 히트맵 데이터 (상위 10명)
        const starTotalMap: Record<string, number> = {};
        for (const data of Object.values(periodMap)) {
            for (const [name, count] of Object.entries(data.stars)) {
                starTotalMap[name] = (starTotalMap[name] || 0) + count;
            }
        }
        const topStars = Object.entries(starTotalMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name]) => name);

        const starHeatmap = topStars.map((starName) => {
            const months: Record<string, number> = {};
            for (const [period, data] of Object.entries(periodMap)) {
                months[period] = data.stars[starName] || 0;
            }
            return { name: starName, months };
        });

        // 전월 대비 성장률
        const growthRates = periods.map((p, i) => {
            if (i === 0) return { period: p.period, growth: 0 };
            const prev = periods[i - 1].total;
            const growth = prev > 0 ? Math.round(((p.total - prev) / prev) * 1000) / 10 : 0;
            return { period: p.period, growth };
        });

        return NextResponse.json({
            periods,
            categories: Array.from(allCategories),
            categoryTrend,
            starHeatmap,
            growthRates,
            summary: {
                totalPeriods: periods.length,
                totalSubmissions: submissions.length,
                latestPeriodTotal: periods[periods.length - 1]?.total ?? 0,
                avgPerPeriod: periods.length > 0 ? Math.round(submissions.length / periods.length) : 0,
            },
        });
    } catch (error) {
        console.error("[insights/trends/extended]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
