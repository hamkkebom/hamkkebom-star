"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
// Removed Atropos and tsparticles for performance
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Sparkles, TrendingUp, Clock, Zap, Play, Search, ArrowUpDown, CheckCircle2, Eye, LayoutGrid, MessageSquare, ArrowRight, AlertTriangle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================================
//  TYPES
// ============================================================
type Submission = {
    id: string;
    version: string;
    versionTitle: string | null;
    status: string;
    createdAt: string;
    streamUid?: string | null;
    thumbnailUrl?: string | null;
    signedThumbnailUrl?: string | null;
    video: {
        id: string;
        title: string;
        description?: string | null;
        thumbnailUrl: string | null;
        streamUid?: string | null;
    } | null;
    star: {
        id: string;
        name: string;
        avatarUrl: string | null;
        email: string;
    };
    assignment?: {
        request: {
            title: string;
        };
    } | null;
    _count?: {
        feedbacks: number;
    };
};

// ============================================================
//  THUMBNAIL HELPERS (서명된 URL 사용)
// ============================================================
function getStaticThumb(sub: Submission): string | null {
    // API에서 생성한 서명된 썸네일 URL 우선 사용
    if (sub.signedThumbnailUrl) return sub.signedThumbnailUrl;
    return null;
}

// Removed PARTICLES_OPTIONS for performance

// ============================================================
//  FILTER TABS
// ============================================================
const FILTERS = [
    { key: "PENDING", label: "대기중", icon: Clock, color: "text-amber-500 dark:text-amber-400" },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye, color: "text-indigo-500 dark:text-indigo-400" },
    { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400" },
    { key: "ALL", label: "전체", icon: LayoutGrid },
];

// ============================================================
//  ANIMATED THUMBNAIL CARD
// ============================================================
function ThumbnailPreview({ sub }: { sub: Submission }) {
    const staticThumb = getStaticThumb(sub);
    const [thumbError, setThumbError] = useState(false);

    return (
        <div
            className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-black rounded-t-2xl"
        >
            {staticThumb && !thumbError ? (
                <Image
                    src={staticThumb}
                    alt={sub.video?.title || "영상 썸네일"}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => setThumbError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/80 dark:to-purple-950/80">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-2xl bg-white/60 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-inner">
                            <Play className="w-8 h-8 text-indigo-400 dark:text-indigo-500/70 fill-indigo-400/20 dark:fill-indigo-500/20" />
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-400/70 dark:text-indigo-600/70 tracking-wider uppercase">Preview</span>
                    </div>
                </div>
            )}

            {/* Gradient overlay for card content readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-[#0a0a12] dark:via-[#0a0a12]/60 dark:to-transparent" />

            {/* Play button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    className="w-14 h-14 rounded-full bg-indigo-600/80 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
                >
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </motion.div>
            </div>

            {/* Version chip */}
            <div className="absolute top-3 right-3 z-10">
                <Badge className="bg-black/60 text-white/90 border-white/10 backdrop-blur-xl font-mono text-[10px] px-2 py-0.5">
                    v{sub.version.replace(/^v/i, "")}
                </Badge>
            </div>
        </div>
    );
}

// ============================================================
//  MAIN DASHBOARD COMPONENT
// ============================================================
export function FeedbackDashboard({ submissions }: { submissions: Submission[] }) {
    const [filter, setFilter] = useState("PENDING");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
    const [particlesReady, setParticlesReady] = useState(false);

    // Removed initParticlesEngine for performance

    const filteredSubmissions = useMemo(() => {
        const result = submissions.filter(s => {
            let matchesFilter = false;
            if (filter === "ALL") matchesFilter = true;
            else if (filter === "COMPLETED") matchesFilter = s.status === "APPROVED" || s.status === "REJECTED" || s.status === "REVISED";
            else matchesFilter = s.status === filter;

            const matchesSearch = !searchQuery ||
                s.video?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.star.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        result.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortBy === "latest" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [submissions, filter, searchQuery, sortBy]);

    // 그룹화 로직 추가: star.id 기준으로 묶기
    const groupedSubmissions = useMemo(() => {
        const groups: Record<string, { star: Submission['star'], submissions: Submission[], latestTime: number }> = {};

        filteredSubmissions.forEach(sub => {
            if (!groups[sub.star.id]) {
                groups[sub.star.id] = {
                    star: sub.star,
                    submissions: [],
                    latestTime: 0
                };
            }
            groups[sub.star.id].submissions.push(sub);

            const subTime = new Date(sub.createdAt).getTime();
            if (subTime > groups[sub.star.id].latestTime) {
                groups[sub.star.id].latestTime = subTime;
            }
        });

        // 최신 제출물이 있는 STAR를 먼저 보여주도록 정렬 (혹은 이름순 등 원하는 정렬)
        return Object.values(groups).sort((a, b) => b.latestTime - a.latestTime);
    }, [filteredSubmissions]);

    const stats = useMemo(() => ({
        total: submissions.length,
        pending: submissions.filter(s => s.status === "PENDING").length,
        inReview: submissions.filter(s => s.status === "IN_REVIEW").length,
        completed: submissions.filter(s => s.status === "APPROVED" || s.status === "REJECTED" || s.status === "REVISED").length,
    }), [submissions]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#050508] dark:via-[#050508] dark:to-[#08081a] relative overflow-hidden text-slate-800 dark:text-slate-200 font-sans">

            {/* ========== PARTICLE BACKGROUND (Removed for Performance) ========== */}

            {/* ========== AMBIENT GLOW (성능 최적화: blur 축소 및 opacity로 대체) ========== */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-400/5 dark:bg-indigo-600/5 blur-[40px] md:blur-[60px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] rounded-full bg-purple-400/5 dark:bg-purple-600/5 blur-[40px] md:blur-[60px]" />
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-cyan-400/5 dark:bg-cyan-600/5 blur-[30px] md:blur-[50px]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-6 lg:px-10 py-10 space-y-10">

                {/* ======================== HEADER ======================== */}
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-widest mb-3 uppercase"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Feedback Command Center</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                            className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[1.1]"
                        >
                            담당 피드백{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400 animate-gradient-x">
                                작성
                            </span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-500 dark:text-slate-500 mt-4 max-w-lg text-sm leading-relaxed"
                        >
                            담당 STAR들의 영상이 여기에 모여있어요. 카드를 기울이고 클릭해서 피드백 우주로!
                        </motion.p>
                    </div>

                    {/* Stats Orbs */}
                    <div className="flex gap-5">
                        {[
                            { label: "전체", value: stats.total, gradient: "from-slate-500 to-slate-400", ring: "ring-slate-300/40 dark:ring-slate-500/20", icon: TrendingUp, iconColor: "#94a3b8" },
                            { label: "대기중", value: stats.pending, gradient: "from-amber-500 to-orange-400", ring: "ring-amber-300/40 dark:ring-amber-500/20", icon: Clock, iconColor: "#f59e0b" },
                            { label: "피드백중", value: stats.inReview, gradient: "from-indigo-500 to-purple-400", ring: "ring-indigo-300/40 dark:ring-indigo-500/20", icon: Zap, iconColor: "#6366f1" },
                            { label: "승인/반려", value: stats.completed, gradient: "from-emerald-500 to-teal-400", ring: "ring-emerald-300/40 dark:ring-emerald-500/20", icon: CheckCircle2, iconColor: "#10b981" }
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl",
                                    "bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08]",
                                    "ring-1", stat.ring,
                                    "hover:bg-white dark:hover:bg-white/[0.06] transition-all duration-300 hover:scale-105 shadow-sm dark:shadow-none"
                                )}
                            >
                                <stat.icon className="w-4 h-4 mb-1" style={{ color: stat.iconColor }} />
                                <span className={cn("text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent", stat.gradient)}>{stat.value}</span>
                                <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-white/40 tracking-widest mt-0.5">{stat.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </header>

                {/* ======================== FILTER BAR ======================== */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row gap-4 items-center justify-between sticky top-4 z-50 p-3 rounded-2xl bg-white/80 dark:bg-black/50 backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-lg dark:shadow-2xl"
                >
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/[0.05]">
                        {FILTERS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "relative px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    filter === tab.key ? "text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                {filter === tab.key && (
                                    <motion.div
                                        layoutId="dashboard-filter"
                                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/30"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                    />
                                )}
                                <tab.icon className={cn("w-3.5 h-3.5 relative z-10", filter !== tab.key && tab.color)} />
                                <span className="relative z-10">{tab.label}</span>
                                {tab.key !== "ALL" && (
                                    <span className={cn(
                                        "relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                                        filter === tab.key ? "bg-white/20" : "bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                                    )}>
                                        {tab.key === "PENDING" ? stats.pending : tab.key === "IN_REVIEW" ? stats.inReview : stats.completed}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
                            <input
                                type="text"
                                placeholder="영상 제목, STAR 이름 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-colors text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                                    <ArrowUpDown className="w-4 h-4" />
                                    {sortBy === "latest" ? "최신순" : "오래된순"}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSortBy("latest")}>
                                    최신순
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                                    오래된순
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </motion.div>

                {/* ======================== GROUPED DASHBOARD ======================== */}
                <div className="space-y-16 pb-20">
                    <AnimatePresence mode="popLayout">
                        {groupedSubmissions.map((group) => (
                            <motion.div
                                key={group.star.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="flex flex-col gap-5"
                            >
                                {/* Group Header (STAR Info) */}
                                <div className="flex items-center gap-4 px-2">
                                    <Avatar className="w-12 h-12 border-2 border-white dark:border-[#0a0a12] shadow-md ring-2 ring-indigo-500/20 dark:ring-indigo-400/20">
                                        <AvatarImage src={group.star.avatarUrl || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-lg">
                                            {group.star.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {group.star.name}
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                                                {group.submissions.length}개의 영상
                                            </span>
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{group.star.email}</p>
                                    </div>
                                </div>

                                {/* Horizontal Scrollable List */}
                                <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 px-2 snap-x snap-mandatory custom-scrollbar group/scroll">
                                    {group.submissions.map((sub) => {
                                        const isPending = sub.status === "PENDING";
                                        const isInReview = sub.status === "IN_REVIEW";
                                        const isApproved = sub.status === "APPROVED";
                                        const isRejected = sub.status === "REJECTED" || sub.status === "REVISED";
                                        const feedbackCount = sub._count?.feedbacks ?? 0;

                                        return (
                                            <div key={sub.id} className="snap-start shrink-0 w-[260px] sm:w-[280px] perspective-1000">
                                                <Link href={`/admin/reviews/my/${sub.id}`} prefetch={false} className="block group/card w-full h-full">
                                                    <div className="w-full h-full relative transition-all duration-300 ease-out transform-gpu group-hover/card:-translate-y-1.5 group-hover/card:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)] dark:group-hover/card:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.2)] rounded-3xl">
                                                        <div className={cn(
                                                            "relative w-full h-full rounded-3xl overflow-hidden border transition-colors duration-300 flex flex-col",
                                                            "bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-xl shadow-sm dark:shadow-none",
                                                            isPending && "border-amber-300/50 hover:border-amber-400/80 dark:border-amber-500/20 dark:hover:border-amber-500/50",
                                                            isInReview && "border-indigo-300/50 hover:border-indigo-400/80 dark:border-indigo-500/20 dark:hover:border-indigo-500/50",
                                                            isApproved && "border-emerald-300/50 hover:border-emerald-400/80 dark:border-emerald-500/20 dark:hover:border-emerald-500/50",
                                                            isRejected && "border-rose-300/50 hover:border-rose-400/80 dark:border-rose-500/20 dark:hover:border-rose-500/50",
                                                            !isPending && !isInReview && !isApproved && !isRejected && "border-slate-200 hover:border-slate-300 dark:border-white/[0.08] dark:hover:border-white/20"
                                                        )}>

                                                            {/* Status Indicator overlapping thumbnail */}
                                                            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                                                                {isPending && (
                                                                    <Badge className="bg-amber-400/90 text-amber-950 border-none shadow-lg shadow-amber-500/20 backdrop-blur-md text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                        <Clock className="w-3 h-3 mr-1" />대기중
                                                                    </Badge>
                                                                )}
                                                                {isInReview && (
                                                                    <Badge className="bg-indigo-500/90 text-white border-none shadow-lg shadow-indigo-500/30 backdrop-blur-md text-[10px] font-bold tracking-wide animate-pulse px-2 py-0.5">
                                                                        <Eye className="w-3 h-3 mr-1" />피드백중
                                                                    </Badge>
                                                                )}
                                                                {isApproved && (
                                                                    <Badge className="bg-emerald-500/90 text-white border-none shadow-lg shadow-emerald-500/20 backdrop-blur-md text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                        <CheckCircle2 className="w-3 h-3 mr-1" />승인됨
                                                                    </Badge>
                                                                )}
                                                                {isRejected && (
                                                                    <Badge className="bg-rose-500/90 text-white border-none shadow-lg shadow-rose-500/20 backdrop-blur-md text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                        <AlertTriangle className="w-3 h-3 mr-1" />반려됨
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Thumbnail Layer - slightly shorter aspect ratio for compact look */}
                                                            <div className="aspect-[16/10] shrink-0">
                                                                <ThumbnailPreview sub={sub} />
                                                            </div>

                                                            {/* Content Layer - Compact Padding */}
                                                            <div className="p-4 flex flex-col grow justify-between bg-gradient-to-b from-transparent to-slate-50/50 dark:to-white/[0.02]">
                                                                <div>
                                                                    {/* Title */}
                                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 mb-2 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors">
                                                                        {sub.video?.title || sub.assignment?.request?.title || sub.versionTitle || "제목 없음"}
                                                                    </h3>

                                                                    {/* Description Snippet (Hidden on very small cards) */}
                                                                    {sub.video?.description && (
                                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-3">
                                                                            {sub.video.description}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className="mt-auto pt-2 flex items-center justify-between">
                                                                    {/* Time Info */}
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                                                        <Clock className="w-3 h-3" />
                                                                        {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true, locale: ko })}
                                                                    </div>
                                                                    {/* Action / Feedback count */}
                                                                    {feedbackCount > 0 ? (
                                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-md">
                                                                            <MessageSquare className="w-3 h-3" />
                                                                            {feedbackCount}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all">
                                                                            <ArrowRight className="w-3 h-3 transition-transform group-hover/card:translate-x-0.5" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredSubmissions.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center mb-6">
                            <Play className="w-10 h-10 text-indigo-400/50 dark:text-indigo-500/50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">표시할 항목이 없습니다</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-600 max-w-sm">
                            {filter !== "ALL" ? "필터를 변경해보세요." : "담당 STAR의 영상이 아직 없습니다."}
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Custom Styles overrides */}
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
