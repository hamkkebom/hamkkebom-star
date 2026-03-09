"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    Trophy, BarChart3, TrendingUp, Sparkles, Wallet, Zap,
    ChevronRight, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
    Trophy: <Trophy className="w-6 h-6" />,
    BarChart3: <BarChart3 className="w-6 h-6" />,
    TrendingUp: <TrendingUp className="w-6 h-6" />,
    Sparkles: <Sparkles className="w-6 h-6" />,
    Wallet: <Wallet className="w-6 h-6" />,
    Zap: <Zap className="w-6 h-6" />,
};

const colorStyles: Record<string, { bg: string; icon: string; border: string; glow: string }> = {
    purple: {
        bg: "bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20",
        icon: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50",
        border: "border-purple-200/60 dark:border-purple-800/40",
        glow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/30",
    },
    green: {
        bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20",
        icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
        border: "border-emerald-200/60 dark:border-emerald-800/40",
        glow: "hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/30",
    },
    blue: {
        bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20",
        icon: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
        border: "border-blue-200/60 dark:border-blue-800/40",
        glow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30",
    },
    pink: {
        bg: "bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/40 dark:to-pink-900/20",
        icon: "text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/50",
        border: "border-pink-200/60 dark:border-pink-800/40",
        glow: "hover:shadow-pink-200/50 dark:hover:shadow-pink-900/30",
    },
    amber: {
        bg: "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20",
        icon: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
        border: "border-amber-200/60 dark:border-amber-800/40",
        glow: "hover:shadow-amber-200/50 dark:hover:shadow-amber-900/30",
    },
    red: {
        bg: "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20",
        icon: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50",
        border: "border-red-200/60 dark:border-red-800/40",
        glow: "hover:shadow-red-200/50 dark:hover:shadow-red-900/30",
    },
};

interface HubCard {
    key: string;
    title: string;
    description: string;
    icon: string;
    value: number;
    suffix?: string;
    format?: string;
    color: string;
    href: string;
}

function formatValue(card: HubCard) {
    if (card.format === "currency") return `${card.value.toLocaleString()}원`;
    return `${card.value.toLocaleString()}${card.suffix || ""}`;
}

export default function InsightsHubPage() {
    const { data, isLoading } = useQuery<{ cards: HubCard[] }>({
        queryKey: ["insights-hub"],
        queryFn: async () => {
            const res = await fetch("/api/admin/insights/hub");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        staleTime: 60_000,
    });

    return (
        <div className="p-4 pb-28 space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-semibold tracking-wide uppercase">Analytics Hub</span>
                </div>
                <h1 className="text-2xl font-bold">고급 분석 대시보드</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    데이터 기반 의사결정을 위한 종합 분석 센터
                </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border bg-muted/30 animate-pulse h-40" />
                    ))
                ) : (
                    data?.cards.map((card, i) => {
                        const style = colorStyles[card.color] || colorStyles.purple;
                        return (
                            <motion.div
                                key={card.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <Link
                                    href={card.href}
                                    className={cn(
                                        "block rounded-2xl border p-5 transition-all duration-200",
                                        "hover:scale-[1.02] hover:shadow-xl",
                                        style.bg, style.border, style.glow
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className={cn("p-2.5 rounded-xl", style.icon)}>
                                            {iconMap[card.icon] || <Activity className="w-6 h-6" />}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-2xl font-bold">{formatValue(card)}</p>
                                        <h3 className="text-sm font-semibold mt-1">{card.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {card.description}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
