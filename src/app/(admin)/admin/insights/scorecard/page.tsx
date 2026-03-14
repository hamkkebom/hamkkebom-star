"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target, MessageSquare, Sparkles, CheckCircle2,
    ArrowLeft, Medal, Crown, Award
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const _GaugeChart = dynamic(
    () => import("@/components/charts/scorecard-charts").then((m) => ({ default: m.GaugeChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[120px]" /> }
);
const StarRadarChart = dynamic(
    () => import("@/components/charts/scorecard-charts").then((m) => ({ default: m.StarRadarChart })),
    { ssr: false, loading: () => <Skeleton className="w-full h-[220px]" /> }
);
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/analytics/kpi-card";
import { DateRangePicker, getDateRange, type DatePreset } from "@/components/analytics/date-range-picker";
import { ChartContainer } from "@/components/analytics/chart-container";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface StarMetrics {
    id: string;
    name: string;
    avatarUrl: string | null;
    grade: string;
    gradeColor: string;
    metrics: {
        deadlineRate: number;
        feedbackRate: number;
        qualityScore: number;
        firstApprovalRate: number;
        avgRevisions: number;
        totalSubmissions: number;
        totalApproved: number;
    };
}

interface ScorecardData {
    stars: StarMetrics[];
    overall: {
        deadlineRate: number;
        feedbackRate: number;
        qualityScore: number;
        firstApprovalRate: number;
        avgRevisions: number;
    };
}

const rankIcons = [
    <Crown key="1" className="w-5 h-5 text-yellow-500" />,
    <Medal key="2" className="w-5 h-5 text-zinc-400" />,
    <Award key="3" className="w-5 h-5 text-amber-700" />,
];

export default function ScorecardPage() {
    const [datePreset, setDatePreset] = useState<DatePreset>("90d");
    const [selectedStar, setSelectedStar] = useState<StarMetrics | null>(null);
    const dateRange = getDateRange(datePreset);

    const { data, isLoading, error } = useQuery<ScorecardData>({
        queryKey: ["insights-scorecard", datePreset],
        queryFn: async () => {
            const res = await fetch(
                `/api/admin/insights/scorecard?from=${dateRange.from}&to=${dateRange.to}`
            );
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        staleTime: 60_000,
    });

    const overall = data?.overall;

    return (
        <div className="p-4 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/insights" className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">STAR 성과 스코어카드</h1>
                    <p className="text-xs text-muted-foreground">납기 준수율, 피드백 반영률, 품질 점수 종합 분석</p>
                </div>
            </div>

            {/* Date Range */}
            <DateRangePicker value={datePreset} onChange={setDatePreset} />

            {/* Overall KPIs */}
            {overall && (
                <div className="grid grid-cols-2 gap-3">
                    <KpiCard
                        title="납기 준수율"
                        value={overall.deadlineRate}
                        suffix="%"
                        icon={<Target className="w-4 h-4" />}
                        color="green"
                        delay={0}
                        decimals={1}
                    />
                    <KpiCard
                        title="피드백 반영률"
                        value={overall.feedbackRate}
                        suffix="%"
                        icon={<MessageSquare className="w-4 h-4" />}
                        color="blue"
                        delay={1}
                        decimals={1}
                    />
                    <KpiCard
                        title="AI 품질 점수"
                        value={overall.qualityScore}
                        suffix="점"
                        icon={<Sparkles className="w-4 h-4" />}
                        color="pink"
                        delay={2}
                        decimals={1}
                    />
                    <KpiCard
                        title="1차 승인률"
                        value={overall.firstApprovalRate}
                        suffix="%"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        color="purple"
                        delay={3}
                        decimals={1}
                    />
                </div>
            )}

            {/* Top 3 STARs */}
            {data && data.stars.length > 0 && (
                <ChartContainer
                    title="🏆 Top STAR 랭킹"
                    description="제출물 기준 상위 STAR"
                    isLoading={isLoading}
                >
                    <div className="space-y-3">
                        {data.stars.slice(0, 3).map((star, i) => (
                            <motion.button
                                key={star.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={() => setSelectedStar(star)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-all text-left"
                            >
                                <span className="flex-shrink-0">{rankIcons[i]}</span>
                                <Avatar className="w-9 h-9">
                                    <AvatarImage src={star.avatarUrl ?? undefined} />
                                    <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                                        {star.name.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold truncate">{star.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                            {star.grade}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                                        <span>납기 {star.metrics.deadlineRate}%</span>
                                        <span>품질 {star.metrics.qualityScore}점</span>
                                        <span>{star.metrics.totalApproved}/{star.metrics.totalSubmissions}건</span>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </ChartContainer>
            )}

            {/* Selected STAR Radar */}
            <AnimatePresence>
                {selectedStar && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <ChartContainer
                            title={`${selectedStar.name} 성과 레이더`}
                            description="5개 지표 종합 비교"
                            action={
                                <button
                                    onClick={() => setSelectedStar(null)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    닫기
                                </button>
                            }
                        >
                            <StarRadarChart star={selectedStar} />
                        </ChartContainer>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full STAR Table */}
            <ChartContainer
                title="전체 STAR 성과"
                description={`총 ${data?.stars.length ?? 0}명`}
                isLoading={isLoading}
                error={error ? "데이터를 불러오지 못했습니다" : null}
                isEmpty={data?.stars.length === 0}
            >
                {/* Mobile Card View */}
                <div className="block md:hidden space-y-2">
                    {data?.stars.map((star, i) => (
                        <motion.div
                            key={star.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedStar(star)}
                            className="rounded-xl bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3"
                        >
                            <div className="flex flex-col items-center gap-1 shrink-0">
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={star.avatarUrl ?? undefined} />
                                    <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                                        {star.name.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium truncate max-w-[60px]">{star.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                    {star.grade}
                                </span>
                            </div>
                            <div className="flex-1 flex flex-wrap gap-1.5">
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">납기</span>
                                    <span className={cn("font-medium", star.metrics.deadlineRate >= 80 ? "text-emerald-600" : star.metrics.deadlineRate >= 50 ? "text-amber-600" : "text-red-500")}>
                                        {star.metrics.deadlineRate}%
                                    </span>
                                </div>
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">피드백</span>
                                    <span className={cn("font-medium", star.metrics.feedbackRate >= 80 ? "text-emerald-600" : "text-amber-600")}>
                                        {star.metrics.feedbackRate}%
                                    </span>
                                </div>
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">품질</span>
                                    <span className={cn("font-medium", star.metrics.qualityScore >= 70 ? "text-purple-600" : "text-amber-600")}>
                                        {star.metrics.qualityScore}
                                    </span>
                                </div>
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">1차승인</span>
                                    <span className="font-medium">{star.metrics.firstApprovalRate}%</span>
                                </div>
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">수정</span>
                                    <span className="font-medium">{star.metrics.avgRevisions}</span>
                                </div>
                                <div className="bg-background/50 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                                    <span className="text-muted-foreground">건수</span>
                                    <span className="font-medium">{star.metrics.totalApproved}/{star.metrics.totalSubmissions}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto -mx-5 px-5">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-muted-foreground">
                                <th className="text-left py-2 pr-2">STAR</th>
                                <th className="text-center py-2 px-1">납기</th>
                                <th className="text-center py-2 px-1">피드백</th>
                                <th className="text-center py-2 px-1">품질</th>
                                <th className="text-center py-2 px-1">1차승인</th>
                                <th className="text-center py-2 px-1">수정</th>
                                <th className="text-center py-2 px-1">건수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.stars.map((star, i) => (
                                <motion.tr
                                    key={star.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="border-b border-dashed hover:bg-muted/30 cursor-pointer"
                                    onClick={() => setSelectedStar(star)}
                                >
                                    <td className="py-2.5 pr-2">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={star.avatarUrl ?? undefined} />
                                                <AvatarFallback className="text-[9px]">{star.name.slice(0, 1)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium truncate max-w-[80px]">{star.name}</span>
                                        </div>
                                    </td>
                                    <td className={cn("text-center py-2", star.metrics.deadlineRate >= 80 ? "text-emerald-600" : star.metrics.deadlineRate >= 50 ? "text-amber-600" : "text-red-500")}>
                                        {star.metrics.deadlineRate}%
                                    </td>
                                    <td className={cn("text-center py-2", star.metrics.feedbackRate >= 80 ? "text-emerald-600" : "text-amber-600")}>
                                        {star.metrics.feedbackRate}%
                                    </td>
                                    <td className={cn("text-center py-2", star.metrics.qualityScore >= 70 ? "text-purple-600" : "text-amber-600")}>
                                        {star.metrics.qualityScore}
                                    </td>
                                    <td className="text-center py-2">{star.metrics.firstApprovalRate}%</td>
                                    <td className="text-center py-2">{star.metrics.avgRevisions}</td>
                                    <td className="text-center py-2 font-semibold">{star.metrics.totalApproved}/{star.metrics.totalSubmissions}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ChartContainer>
        </div>
    );
}
