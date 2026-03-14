"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    ArrowLeft, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const QualityGauge = dynamic(
    () => import("@/components/charts/ai-quality-charts").then((m) => ({ default: m.QualityGauge })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[180px]" /> }
);
const CategoryRadarChart = dynamic(
    () => import("@/components/charts/ai-quality-charts").then((m) => ({ default: m.CategoryRadarChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[240px]" /> }
);
const DistributionChart = dynamic(
    () => import("@/components/charts/ai-quality-charts").then((m) => ({ default: m.DistributionChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[180px]" /> }
);
const MonthlyTrendChart = dynamic(
    () => import("@/components/charts/ai-quality-charts").then((m) => ({ default: m.MonthlyTrendChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[180px]" /> }
);
import { cn } from "@/lib/utils";

import { DateRangePicker, getDateRange, type DatePreset } from "@/components/analytics/date-range-picker";
import { ChartContainer } from "@/components/analytics/chart-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AIQualityData {
    avgOverall: number;
    categoryAvgs: Record<string, number>;
    distribution: Array<{ range: string; count: number }>;
    starRanking: Array<{ id: string; name: string; avatarUrl: string | null; avgScore: number; count: number }>;
    monthlyTrend: Array<{ month: string; avgScore: number; count: number }>;
    lowQuality: Array<{ submissionTitle: string; starName: string; overall: number; categories: Record<string, number> }>;
    totalAnalyzed: number;
}

export default function AIQualityPage() {
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const dateRange = getDateRange(datePreset);

    const { data, isLoading } = useQuery<AIQualityData>({
        queryKey: ["insights-ai-quality", datePreset],
        queryFn: async () => {
            const res = await fetch(
                `/api/admin/insights/ai-quality?from=${dateRange.from}&to=${dateRange.to}`
            );
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        staleTime: 60_000,
    });

    const radarData = data?.categoryAvgs
        ? Object.entries(data.categoryAvgs).map(([key, value]) => ({
            metric: key,
            value,
            fullMark: 100,
        }))
        : [];

    return (
        <div className="p-4 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/insights" className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">AI 품질 자동 평가</h1>
                    <p className="text-xs text-muted-foreground">Gemini 기반 영상 품질 분석 결과</p>
                </div>
            </div>

            <DateRangePicker value={datePreset} onChange={setDatePreset} />

            {/* Quality Gauge + Summary */}
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <ChartContainer
                        title="📊 전체 품질 점수"
                        description={`총 ${data?.totalAnalyzed ?? 0}건 분석`}
                        isLoading={isLoading}
                        isEmpty={!data?.totalAnalyzed}
                    >
                        <QualityGauge score={data?.avgOverall ?? 0} />
                    </ChartContainer>
                </div>
            </div>

            {/* Category Scores (Radar) */}
            {radarData.length > 0 && (
                <ChartContainer
                    title="🎯 항목별 평균 점수"
                    description="각 품질 카테고리 비교"
                    isLoading={isLoading}
                >
                    <CategoryRadarChart data={radarData} />

                    {/* Category mini cards */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {Object.entries(data?.categoryAvgs ?? {}).map(([key, val]) => (
                            <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                                <span className="font-medium">{key}</span>
                                <span className={cn(
                                    "font-bold",
                                    val >= 70 ? "text-emerald-600" : val >= 50 ? "text-amber-600" : "text-red-500"
                                )}>
                                    {val}점
                                </span>
                            </div>
                        ))}
                    </div>
                </ChartContainer>
            )}

            {/* Distribution Histogram */}
            <ChartContainer
                title="📈 품질 점수 분포"
                description="전체 영상의 품질 등급별 분포"
                isLoading={isLoading}
                isEmpty={!data?.distribution.length}
            >
                <DistributionChart data={data?.distribution} />
            </ChartContainer>

            {/* Monthly Trend */}
            <ChartContainer
                title="📉 품질 추이"
                description="월별 평균 품질 점수 변화"
                isLoading={isLoading}
                isEmpty={!data?.monthlyTrend.length}
            >
                <MonthlyTrendChart data={data?.monthlyTrend} />
            </ChartContainer>

            {/* STAR Quality Ranking */}
            <ChartContainer
                title="🏆 STAR 품질 랭킹"
                description="평균 품질 점수 상위 STAR"
                isLoading={isLoading}
                isEmpty={!data?.starRanking.length}
            >
                <div className="space-y-2">
                    {data?.starRanking.slice(0, 10).map((star, i) => (
                        <motion.div
                            key={star.id}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30"
                        >
                            <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                            <Avatar className="w-7 h-7">
                                <AvatarImage src={star.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-[9px]">{star.name.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold truncate block">{star.name}</span>
                                <span className="text-[10px] text-muted-foreground">{star.count}건 분석</span>
                            </div>
                            <span className={cn(
                                "text-sm font-bold",
                                star.avgScore >= 70 ? "text-emerald-600" : star.avgScore >= 50 ? "text-amber-600" : "text-red-500"
                            )}>
                                {star.avgScore}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </ChartContainer>

            {/* Low Quality Warning */}
            {data?.lowQuality && data.lowQuality.length > 0 && (
                <ChartContainer
                    title="⚠️ 개선 필요 영상"
                    description="품질 점수 50점 미만"
                    isLoading={isLoading}
                >
                    <div className="space-y-2">
                        {data.lowQuality.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                                        {item.overall}점
                                    </span>
                                </div>
                                <p className="text-xs font-medium truncate">{item.submissionTitle}</p>
                                <p className="text-[10px] text-muted-foreground">{item.starName}</p>
                            </motion.div>
                        ))}
                    </div>
                </ChartContainer>
            )}
        </div>
    );
}
