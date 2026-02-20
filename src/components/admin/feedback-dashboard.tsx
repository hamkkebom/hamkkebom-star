"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import Atropos from "atropos/react";
import "atropos/css";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
    Search, Play, Clock, MessageSquare,
    Sparkles, LayoutGrid, ArrowRight,
    Eye, Film, Zap, TrendingUp
} from "lucide-react";
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
//  THUMBNAIL HELPERS (Cloudflare Stream 기반)
// ============================================================
function getStaticThumb(sub: Submission): string | null {
    const uid = sub.streamUid || sub.video?.streamUid;
    if (uid) return `https://videodelivery.net/${uid}/thumbnails/thumbnail.jpg?width=640&height=360&fit=crop`;
    return sub.thumbnailUrl || sub.video?.thumbnailUrl || null;
}

function getAnimatedThumb(sub: Submission): string | null {
    const uid = sub.streamUid || sub.video?.streamUid;
    if (uid) return `https://videodelivery.net/${uid}/thumbnails/thumbnail.gif?duration=4s&width=640&height=360&fit=crop`;
    return null;
}

// ============================================================
//  PARTICLES CONFIG (라이트/다크 겸용 - 낮은 투명도)
// ============================================================
const PARTICLES_OPTIONS = {
    fullScreen: false,
    fpsLimit: 60,
    particles: {
        number: { value: 40, density: { enable: true } },
        color: { value: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"] },
        opacity: {
            value: { min: 0.05, max: 0.25 },
            animation: { enable: true, speed: 0.8, startValue: "random" as const, sync: false },
        },
        size: {
            value: { min: 1, max: 3 },
            animation: { enable: true, speed: 1.5, startValue: "random" as const, sync: false },
        },
        move: {
            enable: true,
            speed: 0.4,
            direction: "none" as const,
            random: true,
            straight: false,
            outModes: { default: "out" as const },
        },
        links: {
            enable: true,
            distance: 120,
            color: "#6366f1",
            opacity: 0.06,
            width: 1,
        },
    },
    interactivity: {
        events: {
            onHover: { enable: true, mode: "grab" as const },
        },
        modes: {
            grab: { distance: 140, links: { opacity: 0.2 } },
        },
    },
    detectRetina: true,
};

// ============================================================
//  FILTER TABS
// ============================================================
const FILTERS = [
    { key: "PENDING", label: "대기중", icon: Clock, color: "text-amber-500 dark:text-amber-400" },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye, color: "text-indigo-500 dark:text-indigo-400" },
    { key: "ALL", label: "전체", icon: LayoutGrid },
];

// ============================================================
//  ANIMATED THUMBNAIL CARD (inside Atropos)
// ============================================================
function ThumbnailPreview({ sub }: { sub: Submission }) {
    const staticThumb = getStaticThumb(sub);
    const animatedThumb = getAnimatedThumb(sub);
    const [isHovered, setIsHovered] = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback(() => {
        hoverTimer.current = setTimeout(() => setIsHovered(true), 400);
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setIsHovered(false);
    }, []);

    return (
        <div
            className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-black rounded-t-2xl"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {staticThumb && !thumbError ? (
                <>
                    <Image
                        src={staticThumb}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={cn(
                            "object-cover transition-all duration-700",
                            isHovered && animatedThumb ? "opacity-0 scale-110" : "opacity-90 group-hover:opacity-100 group-hover:scale-105"
                        )}
                        onError={() => setThumbError(true)}
                    />
                    {isHovered && animatedThumb && (
                        <Image
                            src={animatedThumb}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                            unoptimized
                        />
                    )}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/80 dark:to-purple-950/80">
                    <Film className="w-12 h-12 text-indigo-300 dark:text-indigo-700/50" />
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
            <div className="absolute top-3 right-3 z-10" data-atropos-offset="5">
                <Badge className="bg-black/60 text-white/90 border-white/10 backdrop-blur-xl font-mono text-[10px] px-2 py-0.5">
                    v{sub.version}
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
    const [particlesReady, setParticlesReady] = useState(false);

    // Init tsparticles engine
    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => setParticlesReady(true));
    }, []);

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(s => {
            const matchesFilter = filter === "ALL" || s.status === filter;
            const matchesSearch = !searchQuery ||
                s.video?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.star.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [submissions, filter, searchQuery]);

    const stats = useMemo(() => ({
        total: submissions.length,
        pending: submissions.filter(s => s.status === "PENDING").length,
        inReview: submissions.filter(s => s.status === "IN_REVIEW").length,
    }), [submissions]);

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#050508] dark:via-[#050508] dark:to-[#08081a] relative overflow-hidden text-slate-800 dark:text-slate-200 font-sans">

            {/* ========== PARTICLE BACKGROUND ========== */}
            {particlesReady && (
                <Particles
                    id="dashboard-particles"
                    className="absolute inset-0 z-0"
                    options={PARTICLES_OPTIONS as any}
                />
            )}

            {/* ========== AMBIENT GLOW ========== */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-30%] left-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-400/[0.08] dark:bg-indigo-600/[0.07] blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] rounded-full bg-purple-400/[0.06] dark:bg-purple-600/[0.06] blur-[150px]" />
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] rounded-full bg-cyan-400/[0.05] dark:bg-cyan-600/[0.04] blur-[100px]" />
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
                                        {tab.key === "PENDING" ? stats.pending : stats.inReview}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
                        <input
                            type="text"
                            placeholder="영상 제목, STAR 이름 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-700"
                        />
                    </div>
                </motion.div>

                {/* ======================== ATROPOS CARD GRID ======================== */}
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredSubmissions.map((sub, index) => {
                            const isPending = sub.status === "PENDING";
                            const isInReview = sub.status === "IN_REVIEW";
                            const feedbackCount = sub._count?.feedbacks ?? 0;

                            return (
                                <motion.div
                                    key={sub.id}
                                    layout
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                                    transition={{ delay: index * 0.05, duration: 0.4, type: "spring", stiffness: 150 }}
                                >
                                    <Link href={`/admin/reviews/my/${sub.id}`} prefetch={false} className="block group">
                                        <Atropos
                                            className="my-atropos"
                                            activeOffset={40}
                                            shadowScale={1.02}
                                            rotateXMax={12}
                                            rotateYMax={12}
                                            shadow={true}
                                            highlight={true}
                                        >
                                            <div className={cn(
                                                "relative rounded-2xl overflow-hidden border transition-all duration-500",
                                                "bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-xl shadow-md dark:shadow-none",
                                                isPending && "border-amber-300/50 hover:border-amber-400/70 dark:border-amber-500/20 dark:hover:border-amber-400/40",
                                                isInReview && "border-indigo-300/50 hover:border-indigo-400/70 dark:border-indigo-500/20 dark:hover:border-indigo-400/40",
                                                !isPending && !isInReview && "border-slate-200 hover:border-slate-300 dark:border-white/[0.06] dark:hover:border-white/20"
                                            )}>

                                                {/* Status Indicator */}
                                                <div className="absolute top-3 left-3 z-20" data-atropos-offset="8">
                                                    {isPending && (
                                                        <Badge className="bg-amber-100/90 text-amber-700 border-amber-300/50 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 backdrop-blur-xl shadow-sm dark:shadow-lg dark:shadow-amber-500/10 text-[11px]">
                                                            <Clock className="w-3 h-3 mr-1" />대기중
                                                        </Badge>
                                                    )}
                                                    {isInReview && (
                                                        <Badge className="bg-indigo-100/90 text-indigo-700 border-indigo-300/50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 backdrop-blur-xl shadow-sm dark:shadow-lg dark:shadow-indigo-500/10 text-[11px] animate-pulse">
                                                            <Eye className="w-3 h-3 mr-1" />피드백중
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Thumbnail Layer - behind scene */}
                                                <div data-atropos-offset="-3">
                                                    <ThumbnailPreview sub={sub} />
                                                </div>

                                                {/* Content Layer - floats forward */}
                                                <div className="p-5 relative" data-atropos-offset="3">
                                                    {/* Title */}
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors" data-atropos-offset="5">
                                                        {sub.video?.title || sub.assignment?.request?.title || sub.versionTitle || "제목 없음"}
                                                    </h3>

                                                    {/* Description */}
                                                    {sub.video?.description && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                                                            {sub.video.description}
                                                        </p>
                                                    )}

                                                    {/* Meta Chips */}
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.06]">
                                                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                            {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true, locale: ko })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] bg-indigo-50 dark:bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-indigo-200/60 dark:border-white/[0.06]">
                                                            <MessageSquare className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                                                            <span className="text-indigo-600 dark:text-indigo-300 font-bold">{feedbackCount}</span>
                                                            <span className="text-slate-500">피드백</span>
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.05]" data-atropos-offset="6">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar className="w-8 h-8 border-2 border-transparent ring-2 ring-slate-200 dark:ring-white/[0.06] group-hover:ring-indigo-400/60 dark:group-hover:ring-indigo-500/40 transition-all duration-300">
                                                                <AvatarImage src={sub.star.avatarUrl || undefined} />
                                                                <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-indigo-800 dark:to-purple-800 text-white font-bold">
                                                                    {sub.star.name[0]}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                                    {sub.star.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 dark:text-slate-600">STAR</p>
                                                            </div>
                                                        </div>

                                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-400 group-hover:text-white text-slate-400 dark:text-slate-600 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/20">
                                                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Atropos>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>

                {/* Empty State */}
                {filteredSubmissions.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center mb-6">
                            <Film className="w-10 h-10 text-indigo-400/50 dark:text-indigo-500/50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">표시할 항목이 없습니다</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-600 max-w-sm">
                            {filter !== "ALL" ? "필터를 변경해보세요." : "담당 STAR의 영상이 아직 없습니다."}
                        </p>
                    </motion.div>
                )}
            </div>

            {/* Custom Atropos Styles - 라이트/다크 겸용 */}
            <style jsx global>{`
                .my-atropos {
                    perspective: 1200px;
                }
                .my-atropos .atropos-inner {
                    overflow: visible;
                }
                .my-atropos .atropos-shadow {
                    filter: blur(50px);
                    opacity: 0.08;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                }
                .my-atropos .atropos-highlight {
                    background-image: linear-gradient(
                        135deg,
                        rgba(255,255,255,0.08) 0%,
                        rgba(255,255,255,0) 50%
                    );
                }
                .my-atropos:hover .atropos-shadow {
                    opacity: 0.2;
                }
                :is(.dark) .my-atropos .atropos-shadow {
                    opacity: 0.15;
                }
                :is(.dark) .my-atropos:hover .atropos-shadow {
                    opacity: 0.3;
                }
                :is(.dark) .my-atropos .atropos-highlight {
                    background-image: linear-gradient(
                        135deg,
                        rgba(255,255,255,0.12) 0%,
                        rgba(255,255,255,0) 50%
                    );
                }
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 4s ease infinite;
                }
            `}</style>
        </div>
    );
}
