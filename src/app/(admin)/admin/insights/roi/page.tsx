"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Wallet, CheckCircle2, BarChart3, Hash, ArrowLeft,
    TrendingUp
} from "lucide-react";
import Link from "next/link";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area, CartesianGrid, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DateRangePicker, getDateRange, type DatePreset } from "@/components/analytics/date-range-picker";
import { ChartContainer } from "@/components/analytics/chart-container";

const COLORS = ["#7C3AED", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6"];

interface ROISummary {
    totalCost: number;
    totalApproved: number;
    avgCostPerApproved: number;
    totalProjects: number;
}

interface CategoryROI {
    category: string;
    cost: number;
    approved: number;
    total: number;
    costPerApproved: number;
    approvalRate: number;
}

interface GradeROI {
    grade: string;
    cost: number;
    approved: number;
    total: number;
    costPerApproved: number;
    approvalRate: number;
}

interface MonthlyTrend {
    month: string;
    cost: number;
    approved: number;
}

interface ROIData {
    summary: ROISummary;
    byCategory: CategoryROI[];
    byGrade: GradeROI[];
    monthlyTrend: MonthlyTrend[];
    projects: Array<{
        requestId: string;
        title: string;
        categories: string[];
        totalCost: number;
        approvedCount: number;
        totalSubmissions: number;
        avgQualityScore: number;
        costPerApproved: number;
        roi: number;
    }>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
    if (!active || !payload) return null;
    return (
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border rounded-xl p-3 shadow-lg text-xs">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-muted-foreground">
                    {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
                </p>
            ))}
        </div>
    );
}

export default function ROIPage() {
    const [datePreset, setDatePreset] = useState<DatePreset>("year");
    const dateRange = getDateRange(datePreset);

    const { data, isLoading, error } = useQuery<ROIData>({
        queryKey: ["insights-roi", datePreset],
        queryFn: async () => {
            const res = await fetch(
                `/api/admin/insights/roi?from=${dateRange.from}&to=${dateRange.to}`
            );
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
                    <h1 className="text-xl font-bold">프로젝트 ROI 분석</h1>
                    <p className="text-xs text-muted-foreground">투입 비용 대비 성과 종합 분석</p>
                </div>
            </div>

            <DateRangePicker value={datePreset} onChange={setDatePreset} />

            {/* Summary KPIs */}
            {data?.summary && (
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard
                        title="총 투입 비용"
                        value={data.summary.totalCost}
                        format="currency"
                        icon={<Wallet className="w-4 h-4" />}
                        color="purple"
                        delay={0}
                    />
                    <KpiCard
                        title="총 승인 건수"
                        value={data.summary.totalApproved}
                        suffix="건"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        color="green"
                        delay={1}
                    />
                    <KpiCard
                        title="건당 비용"
                        value={data.summary.avgCostPerApproved}
                        format="currency"
                        icon={<BarChart3 className="w-4 h-4" />}
                        color="amber"
                        delay={2}
                    />
                    <KpiCard
                        title="총 프로젝트"
                        value={data.summary.totalProjects}
                        suffix="개"
                        icon={<Hash className="w-4 h-4" />}
                        color="blue"
                        delay={3}
                    />
                </div>
            )}

            {/* Monthly Cost Trend */}
            <ChartContainer
                title="📈 월별 비용 & 승인 추이"
                description="비용(원)과 승인 건수"
                isLoading={isLoading}
                error={error ? "데이터를 불러오지 못했습니다" : null}
                isEmpty={!data?.monthlyTrend.length}
            >
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data?.monthlyTrend}>
                        <defs>
                            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone" dataKey="cost" name="비용"
                            stroke="#7C3AED" fill="url(#costGradient)" strokeWidth={2}
                            animationDuration={800}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* Category ROI */}
            <ChartContainer
                title="📊 카테고리별 비용"
                description="카테고리별 투입 비용 비교"
                isLoading={isLoading}
                isEmpty={!data?.byCategory.length}
            >
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data?.byCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} />
                        <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={60} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="cost" name="비용" radius={[0, 4, 4, 0]} animationDuration={800}>
                            {data?.byCategory.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>

            {/* Grade ROI */}
            <ChartContainer
                title="🏷️ STAR 등급별 효율"
                description="등급별 건당 비용 & 승인률"
                isLoading={isLoading}
                isEmpty={!data?.byGrade.length}
            >
                <div className="space-y-3">
                    {data?.byGrade.map((grade, i) => (
                        <motion.div
                            key={grade.grade}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                        >
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold">{grade.grade}</span>
                                    <span className="text-xs text-muted-foreground">{grade.total}건</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${grade.approvalRate}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
                                    <span>승인률 {grade.approvalRate}%</span>
                                    <span>건당 {grade.costPerApproved.toLocaleString()}원</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </ChartContainer>

            {/* Project Table */}
            <ChartContainer
                title="📋 프로젝트별 ROI"
                description={`상위 ${data?.projects.length ?? 0}개`}
                isLoading={isLoading}
                isEmpty={!data?.projects.length}
            >
                <div className="overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-muted-foreground">
                                <th className="text-left py-2 pr-2">프로젝트</th>
                                <th className="text-right py-2 px-1">비용</th>
                                <th className="text-right py-2 px-1">승인</th>
                                <th className="text-right py-2 px-1">품질</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.projects.slice(0, 15).map((p, i) => (
                                <motion.tr
                                    key={p.requestId}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="border-b border-dashed"
                                >
                                    <td className="py-2.5 pr-2">
                                        <span className="font-medium truncate block max-w-[140px]">{p.title}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {p.categories.join(", ") || "미분류"}
                                        </span>
                                    </td>
                                    <td className="text-right py-2">{p.totalCost.toLocaleString()}</td>
                                    <td className="text-right py-2">
                                        <span className={cn(p.approvedCount > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                                            {p.approvedCount}/{p.totalSubmissions}
                                        </span>
                                    </td>
                                    <td className="text-right py-2">{p.avgQualityScore || "-"}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartContainer>
        </div>
    );
}
