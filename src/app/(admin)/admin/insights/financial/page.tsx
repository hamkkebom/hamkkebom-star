"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CheckCircle2, BarChart3, Hash, TrendingUp, Trophy, Film, ServerCrash, CalendarDays } from "lucide-react";
import { InsightKpiCard } from "@/components/admin/insight-kpi-card";
import { InsightPeriodToggle } from "@/components/admin/insight-period-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

/* ───────── Date Range Presets ───────── */
type DatePreset = "7d" | "30d" | "90d" | "year";
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: "7d", label: "7일" },
    { value: "30d", label: "30일" },
    { value: "90d", label: "90일" },
    { value: "year", label: "올해" },
];

function getDateRange(preset: DatePreset): { from: string; to: string; label: string } {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let fromDate: Date;
    let label: string;
    switch (preset) {
        case "7d": fromDate = new Date(now.getTime() - 7 * 86400000); label = "7일"; break;
        case "30d": fromDate = new Date(now.getTime() - 30 * 86400000); label = "30일"; break;
        case "90d": fromDate = new Date(now.getTime() - 90 * 86400000); label = "90일"; break;
        case "year": fromDate = new Date(now.getFullYear(), 0, 1); label = `${now.getFullYear()}년`; break;
    }
    return { from: fromDate.toISOString().slice(0, 10), to, label };
}

/* ───────── Financial KPIs ───────── */
function FinancialKpiSection({ dateRange }: { dateRange: { from: string; to: string; label: string } }) {
    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'financial', 'kpis', dateRange.from, dateRange.to],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/financial/kpis?from=${dateRange.from}&to=${dateRange.to}`);
            if (!res.ok) throw new Error("Failed to fetch financial KPIs");
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

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case "wallet": return Wallet;
            case "check": return CheckCircle2;
            case "avg": return BarChart3;
            case "count": return Hash;
            default: return Wallet;
        }
    };

    return (
        <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:snap-none md:gap-6 md:pb-0 md:px-0 md:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {data.map((kpi: any, index: number) => (
                <div key={kpi.title} className="w-[85vw] sm:w-[300px] shrink-0 snap-center md:w-auto md:shrink">
                    <InsightKpiCard
                        title={`${kpi.title} (${dateRange.label})`}
                        value={kpi.value}
                        trend={kpi.trend}
                        icon={getIcon(kpi.icon)}
                        suffix={kpi.suffix}
                        prefix={kpi.prefix}
                        isCurrency={kpi.isCurrency}
                        delay={0.1 + (index * 0.1)}
                    />
                </div>
            ))}
        </div>
    );
}

/* ───────── Revenue Trend Chart ───────── */
function FinancialTrendSection() {
    const [period, setPeriod] = useState<"day" | "week" | "month">("month");
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const amber = isDark ? "#fbbf24" : "#f59e0b";
    const rose = isDark ? "#fb7185" : "#f43f5e";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'financial', 'trends', period],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/financial/trends?interval=${period}`);
            if (!res.ok) throw new Error("Failed to fetch financial trends");
            return res.json();
        },
        staleTime: 60000,
    });

    return (
        <Card className="col-span-1 lg:col-span-2 shadow-xl border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-3xl overflow-hidden ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                        정산 수익 트렌드
                    </CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
                        총 정산액 대비 지급 완료액 추이
                    </CardDescription>
                </div>
                <InsightPeriodToggle period={period} onChange={setPeriod} />
            </CardHeader>
            <CardContent className="h-[350px] p-4 pt-0 relative">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-4">
                            <Skeleton className="w-full h-full rounded-2xl bg-white/50 dark:bg-black/20" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key={`chart-${period}`}
                            initial={{ opacity: 0, scaleY: 0.9, originY: 1 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={amber} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={amber} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={rose} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={rose} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: textColor, fontSize: 12 }} dx={-10}
                                        tickFormatter={(val) => new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(val)} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
                                                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-2">{label}</p>
                                                        {payload.map((entry, index) => (
                                                            <div key={index} className="flex items-center gap-2 text-xs font-medium mt-1">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="text-slate-500 dark:text-slate-400">{entry.name === 'total' ? '총 정산액' : '지급 완료'}:</span>
                                                                <span className="text-slate-900 dark:text-white font-bold">₩{new Intl.NumberFormat("ko-KR").format(Number(entry.value))}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area type="monotone" dataKey="total" name="total" stroke={amber} strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, strokeWidth: 0, fill: amber }} />
                                    <Area type="monotone" dataKey="paid" name="paid" stroke={rose} strokeWidth={3} fillOpacity={1} fill="url(#colorPaid)" activeDot={{ r: 6, strokeWidth: 0, fill: rose }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

/* ───────── Top Earning STARs ───────── */
function TopEarningStarsSection({ dateRange }: { dateRange: { from: string; to: string; label: string } }) {
    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'financial', 'leaderboard', dateRange.from, dateRange.to],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/financial/leaderboard?from=${dateRange.from}&to=${dateRange.to}`);
            if (!res.ok) throw new Error("Failed to fetch leaderboard");
            return res.json();
        },
        staleTime: 60000,
    });

    return (
        <Card className="col-span-1 shadow-xl border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl rounded-3xl overflow-hidden flex flex-col ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
            <CardHeader className="pb-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-black/20">
                <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    최고 수익 STAR (Top 5)
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">{dateRange.label} 정산 기준 수익 랭킹</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-800/50" />
                                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-2 w-full" /></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                        {data?.topStars?.map((star: any, index: number) => {
                            const max = data.topStars[0]?.totalAmount || 1;
                            const percent = Math.max(5, (star.totalAmount / max) * 100);

                            return (
                                <motion.div key={star.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}
                                    className="px-6 py-4 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-md">
                                            <AvatarImage src={star.image || ""} />
                                            <AvatarFallback className="text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{star.name.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        {index === 0 && <span className="absolute -top-2 -right-2 text-lg drop-shadow-lg z-10 animate-bounce">👑</span>}
                                        {index > 0 && index < 3 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold border border-white dark:border-slate-800 shadow-sm">{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate tracking-tight">{star.name}</p>
                                            <span className="text-[10px] font-bold text-slate-400">{star.videoCount}건</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                                                    transition={{ delay: 0.5 + index * 0.1, duration: 1, type: "spring", stiffness: 50 }}
                                                    className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-rose-500 dark:bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]"}`}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 tabular-nums">
                                                ₩{new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(star.totalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {(!data?.topStars || data.topStars.length === 0) && (
                            <div className="p-12 flex flex-col items-center justify-center text-center opacity-60">
                                <ServerCrash className="w-10 h-10 text-slate-400 mb-3" />
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">데이터가 없습니다</h4>
                                <p className="text-xs text-slate-400 mt-1">이번 달 정산 데이터가 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ───────── Top Earning Videos ───────── */
function TopEarningVideosSection({ dateRange }: { dateRange: { from: string; to: string; label: string } }) {
    const { data, isLoading } = useQuery({
        queryKey: ['insights', 'financial', 'leaderboard', dateRange.from, dateRange.to],
        queryFn: async () => {
            const res = await fetch(`/api/admin/insights/financial/leaderboard?from=${dateRange.from}&to=${dateRange.to}`);
            if (!res.ok) throw new Error("Failed to fetch leaderboard");
            return res.json();
        },
        staleTime: 60000,
    });

    return (
        <Card className="col-span-1 shadow-xl border-white/40 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl rounded-3xl overflow-hidden flex flex-col ring-1 ring-inset ring-slate-900/5 dark:ring-white/10">
            <CardHeader className="pb-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-black/20">
                <CardTitle className="text-xl font-black flex items-center gap-2 tracking-tight">
                    <Film className="w-5 h-5 text-rose-500" />
                    최고 수익 영상 (Top 5)
                </CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">{dateRange.label} 정산 기준 영상별 수익</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="w-16 h-10 rounded-lg bg-slate-200/50 dark:bg-slate-800/50" />
                                <div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-2 w-full" /></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                        {data?.topVideos?.map((video: any, index: number) => {
                            const max = data.topVideos[0]?.totalAmount || 1;
                            const percent = Math.max(5, (video.totalAmount / max) * 100);

                            return (
                                <motion.div key={video.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1, duration: 0.4 }}
                                    className="px-6 py-4 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-4">
                                    <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0 shadow-md">
                                        {video.thumbnail ? (
                                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Film className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                        {index === 0 && <div className="absolute inset-0 ring-2 ring-amber-400 rounded-lg" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate tracking-tight">{video.title}</p>
                                            <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 ml-2">{video.starName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                                                    transition={{ delay: 0.5 + index * 0.1, duration: 1, type: "spring", stiffness: 50 }}
                                                    className={`h-full rounded-full ${index === 0 ? "bg-gradient-to-r from-rose-400 to-pink-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : "bg-amber-500 dark:bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"}`}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black tracking-widest text-rose-600 dark:text-rose-400 tabular-nums">
                                                ₩{new Intl.NumberFormat("ko-KR", { notation: "compact" }).format(video.totalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {(!data?.topVideos || data.topVideos.length === 0) && (
                            <div className="p-12 flex flex-col items-center justify-center text-center opacity-60">
                                <ServerCrash className="w-10 h-10 text-slate-400 mb-3" />
                                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">데이터가 없습니다</h4>
                                <p className="text-xs text-slate-400 mt-1">이번 달 정산 데이터가 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ───────── Main Page ───────── */
export default function FinancialInsightsPage() {
    const [datePreset, setDatePreset] = useState<DatePreset>("30d");
    const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 pb-10">
            {/* Header */}
            <div>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="text-3xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-amber-800 to-rose-900 dark:from-white dark:via-amber-200 dark:to-rose-200 drop-shadow-sm pb-1"
                >
                    재무 지표 (Financial)
                </motion.h1>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 flex items-center flex-wrap gap-2"
                >
                    정산 데이터와 수익 창출 퍼포먼스를 한눈에 파악하세요.
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-[9px] font-black tracking-widest text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                        FINANCIAL TRACKING
                    </span>
                </motion.div>
            </div>

            {/* Date Range Filter */}
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground mr-1">기간:</span>
                {DATE_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => setDatePreset(p.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${datePreset === p.value
                                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                            }`}
                    >
                        {p.label}
                    </button>
                ))}
            </motion.div>

            {/* Zone A: Financial KPIs */}
            <FinancialKpiSection dateRange={dateRange} />

            {/* Zone B: Revenue Trend */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <FinancialTrendSection />
                <TopEarningStarsSection dateRange={dateRange} />
            </div>

            {/* Zone C: Top Earning Videos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopEarningVideosSection dateRange={dateRange} />
            </div>
        </div>
    );
}
