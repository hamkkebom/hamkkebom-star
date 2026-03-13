"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    TrendingUp, ArrowLeft, CalendarDays, FileText, Percent
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const ProductionTrendChart = dynamic(
    () => import("@/components/charts/trends-charts").then((m) => ({ default: m.ProductionTrendChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[220px]" /> }
);
const CategoryStackChart = dynamic(
    () => import("@/components/charts/trends-charts").then((m) => ({ default: m.CategoryStackChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[220px]" /> }
);
const GrowthRateChart = dynamic(
    () => import("@/components/charts/trends-charts").then((m) => ({ default: m.GrowthRateChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[180px]" /> }
);
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ChartContainer } from "@/components/analytics/chart-container";

interface TrendData {
    periods: Array<{ period: string; total: number; approved: number; approvalRate: number }>;
    categories: string[];
    categoryTrend: Array<Record<string, string | number>>;
    starHeatmap: Array<{ name: string; months: Record<string, number> }>;
    growthRates: Array<{ period: string; growth: number }>;
    summary: {
        totalPeriods: number;
        totalSubmissions: number;
        latestPeriodTotal: number;
        avgPerPeriod: number;
    };
}

export default function TrendsPage() {
    const [groupBy, setGroupBy] = useState<"month" | "quarter">("month");

    const { data, isLoading, error } = useQuery<TrendData>({
        queryKey: ["insights-trends-extended", groupBy],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/trends/extended?groupBy=${groupBy}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        staleTime: 60_000,
    });

    return (
        <div className="p-4 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/insights" className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">시즌별 트렌드</h1>
                    <p className="text-xs text-muted-foreground">콘텐츠 생산량 월별/분기별 추이 분석</p>
                </div>
            </div>

            {/* Group Toggle */}
            <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <div className="flex rounded-xl bg-muted/50 p-1 gap-0.5">
                    {(["month", "quarter"] as const).map((g) => (
                        <button
                            key={g}
                            onClick={() => setGroupBy(g)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                                groupBy === g ? "bg-white dark:bg-zinc-800 shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {g === "month" ? "월별" : "분기별"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary KPIs */}
            {data?.summary && (
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard title="총 제출물" value={data.summary.totalSubmissions} suffix="건" icon={<FileText className="w-4 h-4" />} color="purple" delay={0} />
                    <KpiCard title="이번 달" value={data.summary.latestPeriodTotal} suffix="건" icon={<TrendingUp className="w-4 h-4" />} color="green" delay={1} />
                    <KpiCard title="기간 수" value={data.summary.totalPeriods} suffix={groupBy === "month" ? "개월" : "분기"} icon={<CalendarDays className="w-4 h-4" />} color="blue" delay={2} />
                    <KpiCard title="기간 평균" value={data.summary.avgPerPeriod} suffix="건" icon={<Percent className="w-4 h-4" />} color="amber" delay={3} />
                </div>
            )}

            {/* Production Trend */}
            <ChartContainer
                title="📈 콘텐츠 생산량 추이"
                description={groupBy === "month" ? "월별" : "분기별"}
                isLoading={isLoading}
                error={error ? "데이터를 불러오지 못했습니다" : null}
                isEmpty={!data?.periods.length}
            >
                <ProductionTrendChart data={data?.periods} />
            </ChartContainer>

            {/* Category Stack Chart */}
            {data && data.categories.length > 0 && (
                <ChartContainer
                    title="🎨 카테고리별 분포"
                    description="카테고리별 생산량 분포"
                    isLoading={isLoading}
                    isEmpty={!data.categoryTrend.length}
                >
                    <CategoryStackChart data={data.categoryTrend} categories={data.categories} />
                </ChartContainer>
            )}

            {/* Growth Rate */}
            <ChartContainer
                title="📊 전월 대비 성장률"
                description="기간별 성장률 변화"
                isLoading={isLoading}
                isEmpty={!data?.growthRates.length}
            >
                <GrowthRateChart data={data?.growthRates} />
            </ChartContainer>

            {/* STAR Heatmap */}
            {data && data.starHeatmap.length > 0 && (
                <ChartContainer
                    title="🔥 STAR 생산량 히트맵"
                    description="상위 10명 STAR의 기간별 생산량"
                    isLoading={isLoading}
                >
                    {/* Mobile View */}
                    <div className="block md:hidden space-y-3">
                        {data.starHeatmap.map((star, i) => (
                            <motion.div
                                key={star.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-xl bg-muted/30 p-3"
                            >
                                <div className="font-medium text-sm mb-2">{star.name}</div>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {data.periods.slice(-6).map((p) => {
                                        const val = star.months[p.period] || 0;
                                        const max = Math.max(...Object.values(star.months), 1);
                                        const opacity = val / max;
                                        return (
                                            <div key={p.period} className="flex flex-col items-center gap-1 min-w-[32px]">
                                                <span className="text-[9px] text-muted-foreground">{p.period.slice(-2)}</span>
                                                <div
                                                    className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-medium"
                                                    style={{
                                                        backgroundColor: val > 0 ? `rgba(124, 58, 237, ${0.15 + opacity * 0.7})` : "transparent",
                                                        color: val > 0 ? (opacity > 0.5 ? "white" : "#7C3AED") : "#9ca3af",
                                                    }}
                                                >
                                                    {val || "·"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <div className="overflow-x-auto -mx-5 px-5">
                            <table className="w-full text-[10px]">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-1.5 pr-2 sticky left-0 bg-card">STAR</th>
                                    {data.periods.slice(-8).map((p) => (
                                        <th key={p.period} className="text-center py-1.5 px-1 min-w-[40px]">
                                            {p.period.slice(-2)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.starHeatmap.map((star, i) => (
                                    <tr key={star.name} className="border-b border-dashed">
                                        <td className="py-1.5 pr-2 font-medium truncate max-w-[80px] sticky left-0 bg-card">
                                            {star.name}
                                        </td>
                                        {data.periods.slice(-8).map((p) => {
                                            const val = star.months[p.period] || 0;
                                            const max = Math.max(...Object.values(star.months), 1);
                                            const opacity = val / max;
                                            return (
                                                <td key={p.period} className="text-center py-1.5 px-1">
                                                    <div
                                                        className="w-7 h-7 mx-auto rounded-md flex items-center justify-center text-[9px] font-medium"
                                                        style={{
                                                            backgroundColor: val > 0 ? `rgba(124, 58, 237, ${0.15 + opacity * 0.7})` : "transparent",
                                                            color: val > 0 ? (opacity > 0.5 ? "white" : "#7C3AED") : "#9ca3af",
                                                        }}
                                                    >
                                                        {val || "·"}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </ChartContainer>
            )}
        </div>
    );
}
