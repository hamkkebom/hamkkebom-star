"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    TrendingUp, ArrowLeft, CalendarDays, FileText, Percent
} from "lucide-react";
import Link from "next/link";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, BarChart, Bar, LineChart, Line, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/analytics/kpi-card";
import { ChartContainer } from "@/components/analytics/chart-container";

const STACK_COLORS = ["#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#06B6D4"];

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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
    if (!active || !payload) return null;
    return (
        <div className="bg-muted dark:bg-zinc-900/90 border rounded-xl p-3 shadow-lg text-xs max-w-[200px]">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground">{p.name}: {p.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
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
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data?.periods}>
                        <defs>
                            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="total" name="전체" stroke="#7C3AED" fill="url(#totalGrad)" strokeWidth={2} animationDuration={800} />
                        <Area type="monotone" dataKey="approved" name="승인" stroke="#10B981" fill="url(#approvedGrad)" strokeWidth={2} animationDuration={800} />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* Category Stack Chart */}
            {data && data.categories.length > 0 && (
                <ChartContainer
                    title="🎨 카테고리별 분포"
                    description="카테고리별 생산량 분포"
                    isLoading={isLoading}
                    isEmpty={!data.categoryTrend.length}
                >
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data.categoryTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {data.categories.slice(0, 8).map((cat, i) => (
                                <Bar
                                    key={cat}
                                    dataKey={cat}
                                    name={cat}
                                    stackId="a"
                                    fill={STACK_COLORS[i % STACK_COLORS.length]}
                                    animationDuration={800}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            )}

            {/* Growth Rate */}
            <ChartContainer
                title="📊 전월 대비 성장률"
                description="기간별 성장률 변화"
                isLoading={isLoading}
                isEmpty={!data?.growthRates.length}
            >
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data?.growthRates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="growth" name="성장률" radius={[4, 4, 0, 0]} animationDuration={800}>
                            {data?.growthRates.map((entry, i) => (
                                <Cell key={i} fill={entry.growth >= 0 ? "#10B981" : "#EF4444"} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* STAR Heatmap */}
            {data && data.starHeatmap.length > 0 && (
                <ChartContainer
                    title="🔥 STAR 생산량 히트맵"
                    description="상위 10명 STAR의 기간별 생산량"
                    isLoading={isLoading}
                >
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
                </ChartContainer>
            )}
        </div>
    );
}
