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

        // AI 분석 데이터 가져오기
        const analyses = await prisma.aiAnalysis.findMany({
            where: {
                status: "COMPLETED",
                ...(dateFilter ? { createdAt: dateFilter } : {}),
            },
            select: {
                id: true,
                scores: true,
                summary: true,
                createdAt: true,
                submission: {
                    select: {
                        id: true,
                        versionTitle: true,
                        star: { select: { id: true, name: true, avatarUrl: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // scores 파싱
        interface ParsedAnalysis {
            id: string;
            overall: number;
            categories: Record<string, number>;
            starName: string;
            starId: string;
            starAvatar: string | null;
            submissionTitle: string;
            createdAt: Date;
        }

        const parsed: ParsedAnalysis[] = analyses
            .map((a) => {
                const scores = a.scores as Record<string, number> | null;
                if (!scores || typeof scores.overall !== "number") return null;

                const { overall, ...categories } = scores;
                return {
                    id: a.id,
                    overall,
                    categories,
                    starName: a.submission.star.name,
                    starId: a.submission.star.id,
                    starAvatar: a.submission.star.avatarUrl,
                    submissionTitle: a.submission.versionTitle || "제목 없음",
                    createdAt: a.createdAt,
                };
            })
            .filter(Boolean) as ParsedAnalysis[];

        // 1. 전체 평균 & 항목별 평균
        const allOverall = parsed.map((p) => p.overall);
        const avgOverall = allOverall.length > 0
            ? Math.round((allOverall.reduce((a, b) => a + b, 0) / allOverall.length) * 10) / 10
            : 0;

        const categoryNames = new Set<string>();
        parsed.forEach((p) => Object.keys(p.categories).forEach((k) => categoryNames.add(k)));

        const categoryAvgs: Record<string, number> = {};
        categoryNames.forEach((cat) => {
            const vals = parsed.map((p) => p.categories[cat]).filter((v) => v !== undefined && v > 0);
            categoryAvgs[cat] = vals.length > 0
                ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
                : 0;
        });

        // 2. 분포 히스토그램
        const distribution = [
            { range: "0-20", count: 0 },
            { range: "21-40", count: 0 },
            { range: "41-60", count: 0 },
            { range: "61-80", count: 0 },
            { range: "81-100", count: 0 },
        ];
        allOverall.forEach((v) => {
            if (v <= 20) distribution[0].count++;
            else if (v <= 40) distribution[1].count++;
            else if (v <= 60) distribution[2].count++;
            else if (v <= 80) distribution[3].count++;
            else distribution[4].count++;
        });

        // 3. STAR별 품질 랭킹
        const starMap: Record<string, { scores: number[]; name: string; avatar: string | null }> = {};
        parsed.forEach((p) => {
            if (!starMap[p.starId]) starMap[p.starId] = { scores: [], name: p.starName, avatar: p.starAvatar };
            starMap[p.starId].scores.push(p.overall);
        });

        const starRanking = Object.entries(starMap)
            .map(([id, data]) => ({
                id,
                name: data.name,
                avatarUrl: data.avatar,
                avgScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
                count: data.scores.length,
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

        // 4. 월별 품질 추이
        const monthMap: Record<string, number[]> = {};
        parsed.forEach((p) => {
            const month = new Date(p.createdAt).toISOString().slice(0, 7);
            if (!monthMap[month]) monthMap[month] = [];
            monthMap[month].push(p.overall);
        });

        const monthlyTrend = Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, scores]) => ({
                month,
                avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
                count: scores.length,
            }));

        // 5. 개선 필요 영상 (overall < 50)
        const lowQuality = parsed
            .filter((p) => p.overall < 50)
            .sort((a, b) => a.overall - b.overall)
            .slice(0, 10)
            .map((p) => ({
                submissionTitle: p.submissionTitle,
                starName: p.starName,
                overall: p.overall,
                categories: p.categories,
            }));

        return NextResponse.json({
            avgOverall,
            categoryAvgs,
            distribution,
            starRanking: starRanking.slice(0, 15),
            monthlyTrend,
            lowQuality,
            totalAnalyzed: parsed.length,
        });
    } catch (error) {
        console.error("[insights/ai-quality]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
