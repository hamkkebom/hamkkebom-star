"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Sparkles, ArrowLeft, Trophy, AlertTriangle, TrendingUp
} from "lucide-react";
import Link from "next/link";
import {
    RadialBarChart, RadialBar, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
    LineChart, Line,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DateRangePicker, getDateRange, type DatePreset } from "@/components/analytics/date-range-picker";
import { ChartContainer } from "@/components/analytics/chart-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DIST_COLORS = ["#EF4444", "#F59E0B", "#FBBF24", "#10B981", "#7C3AED"];

interface AIQualityData {
    avgOverall: number;
    categoryAvgs: Record<string, number>;
    distribution: Array<{ range: string; count: number }>;
    starRanking: Array<{ id: string; name: string; avatarUrl: string | null; avgScore: number; count: number }>;
    monthlyTrend: Array<{ month: string; avgScore: number; count: number }>;
    lowQuality: Array<{ submissionTitle: string; starName: string; overall: number; categories: Record<string, number> }>;
    totalAnalyzed: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
    if (!active || !payload) return null;
    return (
        <div className="bg-muted dark:bg-zinc-900/90 border rounded-xl p-3 shadow-lg text-xs">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-muted-foreground">{p.name}: {p.value}</p>
            ))}
        </div>
    );
}

function QualityGauge({ score }: { score: number }) {
    const data = [{ name: "score", value: score, fill: score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444" }];
    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart
                    cx="50%" cy="55%"
                    innerRadius="65%"
                    outerRadius="95%"
                    startAngle={210}
                    endAngle={-30}
                    data={data}
                    barSize={14}
                >
                    <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        background={{ fill: "#e5e7eb" }}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
                <span className="text-3xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground">전체 평균</span>
            </div>
        </div>
    );
}

export default function AIQualityPage() {
    const [datePreset, setDatePreset] = useState<DatePreset>("all");
    const dateRange = getDateRange(datePreset);

    const { data, isLoading, error } = useQuery<AIQualityData>({
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
                    <ResponsiveContainer width="100%" height={240}>
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                dataKey="value" name="평균 점수"
                                stroke="#EC4899" fill="#EC4899" fillOpacity={0.2} strokeWidth={2}
                                animationDuration={800}
                            />
                        </RadarChart>
                    </ResponsiveContainer>

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
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data?.distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="영상 수" radius={[6, 6, 0, 0]} animationDuration={800}>
                            {data?.distribution.map((_, i) => (
                                <Cell key={i} fill={DIST_COLORS[i]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* Monthly Trend */}
            <ChartContainer
                title="📉 품질 추이"
                description="월별 평균 품질 점수 변화"
                isLoading={isLoading}
                isEmpty={!data?.monthlyTrend.length}
            >
                <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data?.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone" dataKey="avgScore" name="평균 점수"
                            stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }}
                            animationDuration={800}
                        />
                    </LineChart>
                </ResponsiveContainer>
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
