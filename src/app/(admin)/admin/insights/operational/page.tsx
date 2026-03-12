"use client";

import { useState } from "react";
import { startOfMonth, differenceInDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Film, UserSquare2, Users, Clock, AlertCircle, TrendingUp, Zap, ServerCrash } from "lucide-react";
import { InsightKpiCard } from "@/components/admin/insight-kpi-card";
import { TrendAreaChart } from "@/components/admin/trend-area-chart";
import { DateRangePicker, type DateRange } from "@/components/admin/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

function OperationalKpiSection({ dateRange }: { dateRange: DateRange }) {
    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'operational', 'kpis', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/operational/kpis?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`);
            if (!res.ok) throw new Error("Failed to fetch KPIs");
            return res.json();
        },
        staleTime: 60000,
    });

    if (isLoading) {
        return (
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:gap-6 md:pb-0 md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-[85vw] sm:w-[300px] md:w-auto shrink-0 h-40 rounded-3xl bg-slate-200/50 dark:bg-slate-800/50" />
                ))}
            </div>
        );
    }

    if (!data) return null;

    // Map icons returned from API
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case "project": return UserSquare2;
            case "video": return Film;
            case "clock": return Clock;
            case "user": return Users;
            default: return AlertCircle;
        }
    }

    return (
        <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:snap-none md:gap-6 md:pb-0 md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {data.map((kpi: { title: string; value: number; trend: number; icon: string; suffix?: string; prefix?: string; description?: string }, index: number) => (
                <div key={kpi.title} className="w-[85vw] sm:w-[300px] shrink-0 snap-center md:w-auto md:shrink">
                    <InsightKpiCard
                        title={kpi.title}
                        value={kpi.value}
                        trend={kpi.trend}
                        icon={getIcon(kpi.icon)}
                        suffix={kpi.suffix}
                        prefix={kpi.prefix}
                        description={kpi.description}
                        isCurrency={false}
                        delay={0.1 + (index * 0.1)}
                    />
                </div>
            ))}
        </div>
    );
}

function OperationalTrendSection({ dateRange }: { dateRange: DateRange }) {

    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'operational', 'trends', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/operational/trends?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`);
            if (!res.ok) throw new Error("Failed to fetch trends");
            return res.json();
        },
        staleTime: 60000,
    });

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-xl border-border dark:border-border bg-card dark:bg-slate-900/40 rounded-3xl overflow-hidden ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                        <TrendingUp className="w-5 h-5 text-cyan-500" />
                        수요 & 공급 트렌드
                    </CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
                        접수된 영상 대비 처리된 영상 파도
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="h-[350px] p-4 pt-0 relative">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-4"
                        >
                            <Skeleton className="w-full h-full rounded-2xl bg-card dark:bg-card" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`chart-trend`}
                            initial={{ opacity: 0, scaleY: 0.9, originY: 1 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-full h-full"
                        >
                            {/* Reusing existing TrendAreaChart with mapping assuming it accepts 'submitted' and 'approved' / 'processed' keys */}
                            {/* For compatibility with existing TrendAreaChart which expects 'submitted' and 'approved' keys: */}
                            <TrendAreaChart data={data?.map((d: { date: string; submissions: number; processed: number }) => ({ date: d.date, submitted: d.submissions, approved: d.processed })) || []} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

function OperationalSpeedLeaderboardSection({ dateRange }: { dateRange: DateRange }) {
    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'operational', 'speed', dateRange.from.toISOString(), dateRange.to.toISOString()],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/operational/speed-ranking?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`);
            if (!res.ok) throw new Error("Failed to fetch speed ranking");
            return res.json();
        },
        staleTime: 60000,
    });

    return (
        <Card className="col-span-1 shadow-xl border-border dark:border-border bg-card dark:bg-slate-900/60 rounded-3xl overflow-hidden flex flex-col ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
            <CardHeader className="pb-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-accent dark:bg-card">
                <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                    <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                    피드백 속도 에이스 (Top 5)
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">STAR별 평균 피드백 소요 시간 (최소 3건 이상)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-800/50" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-24 bg-slate-200/50 dark:bg-slate-800/50" />
                                    <Skeleton className="h-2 w-full bg-slate-200/50 dark:bg-slate-800/50" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                        {data?.map((star: { id: string; name: string; image?: string; avgTimeHours: number; totalFeedbacks: number }, index: number) => {
                            // Find Max for bar width. Since lower is better, we invert the logic. Data is already sorted asc (fastest first).
                            // Let's cap the visual max at something reasonable, say 72 hours (3 days).
                            const maxVisualHours = 48;
                            const percent = Math.max(5, Math.min(100, 100 - ((star.avgTimeHours / maxVisualHours) * 100)));

                            return (
                                <motion.div
                                    key={star.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1, duration: 0.4 }}
                                    className="px-6 py-4 hover:bg-secondary/500 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4 group"
                                >
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-md">
                                            <AvatarImage src={star.image || ""} />
                                            <AvatarFallback className="text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                {star.name.slice(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {index === 0 && (
                                            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-foreground drop-shadow-lg z-10 animate-bounce flex items-center justify-center p-0.5">
                                                <Zap className="w-full h-full" />
                                            </span>
                                        )}
                                        {index > 0 && index < 3 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold border border-white dark:border-slate-800 shadow-sm">
                                                {index + 1}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-foreground truncate tracking-tight">
                                                {star.name}
                                            </p>
                                            <span className="text-[10px] font-bold text-slate-400">총 {star.totalFeedbacks}건</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex justify-start">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percent}%` }}
                                                    transition={{ delay: 0.5 + index * 0.1, duration: 1, type: "spring", stiffness: 50 }}
                                                    className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"}`}
                                                />
                                            </div>
                                            <span className="text-xs font-black tracking-widest text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                {star.avgTimeHours}h
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                        {(!data || data.length === 0) && (
                            <div className="p-12 flex flex-col items-center justify-center text-center opacity-60">
                                <ServerCrash className="w-10 h-10 text-slate-400 mb-3" />
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">데이터가 없습니다</h4>
                                <p className="text-xs text-slate-400 mt-1">최소 3건 이상의 완료된 피드백이 필요합니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function OperationalInsightsPage() {
    const [dateRange, setDateRange] = useState<DateRange>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10">
            {/* Header */}
            <div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-cyan-800 to-emerald-900 dark:from-white dark:via-cyan-200 dark:to-emerald-200 drop-shadow-sm pb-1"
                        >
                            운영 지표 (Operational)
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center"
                        >
                            플랫폼 내 프로젝트 생성 및 영상 처리 퍼포먼스를 점검하세요.
                        </motion.div>
                    </div>
                    <div className="flex items-center pt-1">
                        <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                    </div>
                </div>
            </div>

            {/* Zone A: Kpi Metrics */}
            <OperationalKpiSection dateRange={dateRange} />

            {/* Zone B & C: Main Charts & Leaderboards */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <OperationalTrendSection dateRange={dateRange} />
                <OperationalSpeedLeaderboardSection dateRange={dateRange} />
            </div>

            {/* Actionable Insights Spacer if needed */}
        </div>
    );
}
