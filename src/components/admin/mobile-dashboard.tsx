"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    FileText,
    Clock,
    CheckCircle2,

    PlaySquare,
    Users,
    CreditCard,
    Settings,
    ChevronRight,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SubmissionStatus } from "@/generated/prisma/client";

// Types

export function AdminMobileDashboard({
    counts,
    adEligibleCount,
}: {
    counts: Record<SubmissionStatus, number>;
    adEligibleCount?: number;
    adIneligibleCount?: number;
}) {
    const cards = useMemo(() => [
        {
            id: "IN_REVIEW",
            title: "리뷰 대기",
            count: counts["IN_REVIEW"] || 0,
            icon: FileText,
            color: "from-blue-500 to-indigo-600",
            link: "/admin/reviews?filter=IN_REVIEW",
            urgent: (counts["IN_REVIEW"] || 0) > 0,
        },
        {
            id: "PENDING",
            title: "신규 제출/수정본",
            count: (counts["PENDING"] || 0) + (counts["REVISED"] || 0),
            icon: Clock,
            color: "from-amber-500 to-orange-500",
            link: "/admin/reviews?filter=PENDING",
        },
        {
            id: "APPROVED",
            title: "승인 완료",
            count: counts["APPROVED"] || 0,
            icon: CheckCircle2,
            color: "from-emerald-500 to-green-600",
            link: "/admin/reviews?filter=COMPLETED",
        },
        {
            id: "AD_ELIGIBLE",
            title: "광고 송출 가능",
            count: adEligibleCount || 0,
            icon: PlaySquare,
            color: "from-fuchsia-500 to-purple-600",
            link: "/admin/videos",
        },
    ], [counts, adEligibleCount]);

    const quickActions = [
        { icon: FileText, label: "리뷰하러 가기", link: "/admin/reviews?filter=IN_REVIEW", bg: "bg-indigo-50 dark:bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
        { icon: Users, label: "스타 가입 승인", link: "/admin/users?filter=pending", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
        { icon: CreditCard, label: "정산 내역", link: "/admin/settlements", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
        { icon: TrendingUp, label: "통계 지표", link: "/admin/insights/growth", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", text: "text-fuchsia-600 dark:text-fuchsia-400" },
    ];

    return (
        <div className="flex flex-col gap-6 md:hidden pb-10">
            {/* 1. Summary Widgets (Horizontal Snap Scroll) */}
            <section>
                <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-sm font-bold tracking-tight px-1">현황 요약</h2>
                </div>
                <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 -mx-4 px-4 gap-3">
                    {cards.map((card, i) => (
                        <Link key={card.id} href={card.link} className="shrink-0 snap-center outline-none">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 24 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative overflow-hidden rounded-2xl p-5 shadow-sm border bg-white dark:bg-[#0c0c14] dark:border-border/50 w-[240px] h-[130px] flex flex-col justify-between"
                            >
                                {/* Background Glow */}
                                <div className={cn("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br", card.color)} />

                                <div className="flex items-center justify-between z-10">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-md text-foreground", card.color)}>
                                        <card.icon className="w-5 h-5" />
                                    </div>
                                    {card.urgent && (
                                        <div className="flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                        </div>
                                    )}
                                </div>

                                <div className="z-10">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
                                    <p className="text-3xl font-black tabular-nums tracking-tight">
                                        {card.count}
                                    </p>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 2. Quick Actions Grid */}
            <section className="px-1">
                <h2 className="text-sm font-bold tracking-tight mb-3">빠른 실행</h2>
                <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action, i) => (
                        <Link key={i} href={action.link}>
                            <motion.div
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#0c0c14] border dark:border-border/50 shadow-sm active:bg-slate-50 dark:active:bg-secondary/30 transition-colors"
                            >
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", action.bg, action.text)}>
                                    <action.icon className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-xs font-bold truncate">{action.label}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 3. Recent Timeline / Tips */}
            <section className="px-1 mt-2">
                <h2 className="text-sm font-bold tracking-tight mb-3">최근 활동 및 알림</h2>
                <div className="bg-white dark:bg-[#0c0c14] border dark:border-border/50 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center">
                        <Settings className="w-6 h-6 text-indigo-500 animate-[spin_4s_linear_infinite]" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        앱 환경 최적화 중
                    </p>
                    <p className="text-xs text-slate-500 text-balance leading-relaxed">
                        이제 하단 탭과 제스처 스와이프로<br /> 더 빠르게 업무를 처리하세요.
                    </p>
                </div>
            </section>
        </div>
    );
}
