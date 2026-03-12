"use client";

import React from "react";
import { TrendingUp, Clock, Zap, CheckCircle2, LayoutGrid, Search, ArrowUpDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS = [
    { key: "PENDING", label: "대기중", icon: Clock, color: "text-amber-500 dark:text-amber-400" },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye, color: "text-indigo-500 dark:text-indigo-400" },
    { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400" },
    { key: "ALL", label: "전체", icon: LayoutGrid },
];

export function FeedbackDashboardSkeleton() {
    const dummyGroups = Array.from({ length: 3 });
    const dummyItems = Array.from({ length: 4 });

    return (
        <div className="space-y-8">
            {/* ======================== HEADER ======================== */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        담당 피드백{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
                            작성
                        </span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
                        담당 STAR들의 영상이 여기에 모여있어요. 카드를 기울이고 클릭해서 피드백 우주로!
                    </p>
                </div>

                {/* Stats Orbs Skeleton */}
                <div className="flex gap-3 sm:gap-4 flex-wrap">
                    {[
                        { label: "전체", icon: TrendingUp, iconColor: "text-slate-500" },
                        { label: "대기중", icon: Clock, iconColor: "text-amber-500" },
                        { label: "피드백중", icon: Zap, iconColor: "text-indigo-500" },
                        { label: "승인/반려", icon: CheckCircle2, iconColor: "text-emerald-500" }
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="relative flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-card border border-border shadow-sm"
                        >
                            <stat.icon className={cn("w-4 h-4 mb-1 opacity-50", stat.iconColor)} />
                            <div className="h-7 w-10 mt-1 mb-0.5 bg-muted animate-pulse rounded-md" />
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </header>

            {/* ======================== FILTER BAR SKELETON ======================== */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                    {FILTERS.map((tab, i) => (
                        <div
                            key={tab.key}
                            className={cn(
                                "relative px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all",
                                i === 0 ? "text-foreground bg-gradient-to-r from-indigo-500/80 to-purple-500/80 rounded-lg shadow-sm" : "text-muted-foreground"
                            )}
                        >
                            <tab.icon className={cn("w-3.5 h-3.5 opacity-70", i !== 0 && tab.color)} />
                            <span>{tab.label}</span>
                            {tab.key !== "ALL" && (
                                <div className={cn(
                                    "h-4 w-6 rounded-full animate-pulse",
                                    i === 0 ? "bg-accent" : "bg-muted"
                                )} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <div className="w-full h-10 bg-muted border border-border rounded-xl flex items-center pl-10">
                            <span className="text-sm text-muted-foreground">영상 제목, STAR 이름 검색...</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 px-4 h-10 w-24 bg-muted border border-border rounded-xl">
                        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                        <div className="h-4 w-10 bg-muted-foreground/20 animate-pulse rounded" />
                    </div>
                </div>
            </div>

            {/* ======================== GROUPED SKELETON ======================== */}
            <div className="space-y-12 pb-20">
                {dummyGroups.map((_, groupIndex) => (
                    <div key={groupIndex} className="flex flex-col gap-5">
                        {/* Group Header (STAR Info Skeleton) */}
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-12 h-12 rounded-full bg-muted animate-pulse border-2 border-background" />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                                    <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                                </div>
                                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                            </div>
                        </div>

                        {/* Horizontal Scrollable List Skeleton */}
                        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 px-2 custom-scrollbar">
                            {dummyItems.map((_, itemIndex) => (
                                <div key={itemIndex} className="shrink-0 w-[280px] sm:w-[300px]">
                                    <div className="w-full h-full relative rounded-2xl">
                                        <div className="relative w-full h-full rounded-2xl overflow-hidden border border-border bg-card shadow-sm flex flex-col">

                                            {/* Status Badge Skeleton */}
                                            <div className="absolute top-3 left-3 z-20">
                                                <div className="h-6 w-16 bg-muted rounded px-2 py-0.5 animate-pulse" />
                                            </div>

                                            {/* Thumbnail Layer Skeleton */}
                                            <div className="aspect-[16/10] shrink-0 bg-muted animate-pulse relative" />

                                            {/* Content Layer Skeleton */}
                                            <div className="p-4 flex flex-col grow justify-between">
                                                <div>
                                                    <div className="h-4 bg-muted rounded-md w-3/4 mb-2 animate-pulse" />
                                                    <div className="h-4 bg-muted rounded-md w-1/2 mb-4 animate-pulse" />
                                                    <div className="h-3 bg-muted/60 rounded w-full mb-3 animate-pulse" />
                                                </div>

                                                {/* Footer Skeleton */}
                                                <div className="mt-auto pt-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
                                                        <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                                                    </div>
                                                    <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom Styles */}
            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.4);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.7);
                }
            `}</style>
        </div>
    );
}
