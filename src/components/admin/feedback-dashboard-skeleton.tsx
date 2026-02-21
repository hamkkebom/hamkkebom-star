"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, TrendingUp, Clock, Zap, CheckCircle2, LayoutGrid, Search, ArrowUpDown, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// Removed Atropos and tsparticles for performance

// Removed PARTICLES_OPTIONS for performance

const FILTERS = [
    { key: "PENDING", label: "대기중", icon: Clock, color: "text-amber-500 dark:text-amber-400" },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye, color: "text-indigo-500 dark:text-indigo-400" },
    { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400" },
    { key: "ALL", label: "전체", icon: LayoutGrid },
];

export function FeedbackDashboardSkeleton() {
    // Removed initParticlesEngine for performance

    // Create 3 dummy STAR groups
    const dummyGroups = Array.from({ length: 3 });
    // Create 4 dummy items per STAR group
    const dummyItems = Array.from({ length: 4 });

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#050508] dark:via-[#050508] dark:to-[#08081a] relative overflow-hidden text-slate-800 dark:text-slate-200 font-sans">
            {/* ========== PARTICLE BACKGROUND (Removed for Performance) ========== */}

            {/* ========== AMBIENT GLOW ========== */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-400/[0.08] dark:bg-indigo-600/[0.07] blur-[80px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] rounded-full bg-purple-400/[0.06] dark:bg-purple-600/[0.06] blur-[80px]" />
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-cyan-400/[0.05] dark:bg-cyan-600/[0.04] blur-[60px]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 py-10 space-y-10">
                {/* ======================== HEADER ======================== */}
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-widest mb-3 uppercase opacity-80">
                            <Sparkles className="w-4 h-4" />
                            <span>Feedback Command Center</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1]">
                            담당 피드백{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 animate-gradient-x">
                                작성
                            </span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-500 mt-4 max-w-lg text-sm leading-relaxed">
                            담당 STAR들의 영상이 여기에 모여있어요. 카드를 기울이고 클릭해서 피드백 우주로!
                        </p>
                    </div>

                    {/* Stats Orbs Skeleton */}
                    <div className="flex gap-5">
                        {[
                            { label: "전체", icon: TrendingUp, iconColor: "#94a3b8" },
                            { label: "대기중", icon: Clock, iconColor: "#f59e0b" },
                            { label: "피드백중", icon: Zap, iconColor: "#6366f1" },
                            { label: "승인/반려", icon: CheckCircle2, iconColor: "#10b981" }
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl",
                                    "bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08]",
                                    "shadow-sm dark:shadow-none"
                                )}
                            >
                                <stat.icon className="w-4 h-4 mb-1 opacity-50" style={{ color: stat.iconColor }} />
                                <div className="h-7 w-10 mt-1 mb-0.5 bg-slate-200 dark:bg-white/10 animate-pulse rounded-md" />
                                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-widest mt-0.5">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </header>

                {/* ======================== FILTER BAR SKELETON ======================== */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-50 p-3 rounded-2xl bg-white/80 dark:bg-black/50 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-lg dark:shadow-2xl">
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/[0.05]">
                        {FILTERS.map((tab, i) => (
                            <div
                                key={tab.key}
                                className={cn(
                                    "relative px-5 py-2.5 text-xs font-bold flex items-center gap-2 transition-all",
                                    i === 0 ? "text-white bg-gradient-to-r from-indigo-500/80 to-purple-500/80 rounded-lg shadow-sm" : "text-slate-500 dark:text-slate-400"
                                )}
                            >
                                <tab.icon className={cn("w-3.5 h-3.5 opacity-70", i !== 0 && tab.color)} />
                                <span>{tab.label}</span>
                                {tab.key !== "ALL" && (
                                    <div className={cn(
                                        "h-4 w-6 rounded-full animate-pulse",
                                        i === 0 ? "bg-white/30" : "bg-slate-200 dark:bg-white/10"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <div className="w-full h-10 bg-slate-100 dark:bg-white/[0.03] border border-transparent rounded-xl flex items-center pl-10">
                                <span className="text-sm text-slate-400 dark:text-slate-600">영상 제목, STAR 이름 검색...</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-4 h-10 w-24 bg-slate-100 dark:bg-white/[0.03] border border-transparent rounded-xl">
                            <ArrowUpDown className="w-4 h-4 text-slate-400" />
                            <div className="h-4 w-10 bg-slate-200 dark:bg-white/10 animate-pulse rounded" />
                        </div>
                    </div>
                </div>

                {/* ======================== GROUPED SKELETON ======================== */}
                <div className="space-y-16 pb-20">
                    {dummyGroups.map((_, groupIndex) => (
                        <div key={groupIndex} className="flex flex-col gap-5">
                            {/* Group Header (STAR Info Skeleton) */}
                            <div className="flex items-center gap-4 px-2">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-[#0a0a12]" />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-24 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                        <div className="h-5 w-16 bg-slate-100 dark:bg-white/5 rounded-full animate-pulse" />
                                    </div>
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-white/5 rounded animate-pulse" />
                                </div>
                            </div>

                            {/* Horizontal Scrollable List Skeleton */}
                            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 px-2 custom-scrollbar">
                                {dummyItems.map((_, itemIndex) => (
                                    <div key={itemIndex} className="shrink-0 w-[260px] sm:w-[280px] perspective-1000">
                                        <div className="w-full h-full relative rounded-3xl">
                                            <div className="relative w-full h-full rounded-3xl overflow-hidden border border-slate-200 dark:border-white/[0.06] bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-xl shadow-sm dark:shadow-none flex flex-col">

                                                {/* Status Badge Skeleton */}
                                                <div className="absolute top-3 left-3 z-20">
                                                    <div className="h-6 w-16 bg-slate-200/80 dark:bg-white/10 backdrop-blur-md rounded px-2 py-0.5 animate-pulse" />
                                                </div>

                                                {/* Thumbnail Layer Skeleton */}
                                                <div className="aspect-[16/10] shrink-0 bg-slate-200 dark:bg-white/5 animate-pulse relative" />

                                                {/* Content Layer Skeleton */}
                                                <div className="p-4 flex flex-col grow justify-between">
                                                    <div>
                                                        {/* Title */}
                                                        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-md w-3/4 mb-2 animate-pulse" />
                                                        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-md w-1/2 mb-4 animate-pulse" />

                                                        {/* Description */}
                                                        <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-full mb-3 animate-pulse" />
                                                    </div>

                                                    {/* Footer Skeleton */}
                                                    <div className="mt-auto pt-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                                                            <div className="h-3 w-12 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                                                        </div>
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.06] animate-pulse" />
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
            </div>

            {/* Custom Styles */}
            <style jsx global>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 4s ease infinite;
                }
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
