"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
// Removed Atropos and tsparticles for performance
import { formatDistanceToNow, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { TrendingUp, Clock, Zap, Play, Search, ArrowUpDown, CheckCircle2, Eye, LayoutGrid, MessageSquare, ArrowRight, AlertTriangle, X, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";

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
        chineseName?: string | null;
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
export function ThumbnailPreview({
    thumbnailUrl,
    videoTitle,
    version,
    status
}: {
    thumbnailUrl: string | null;
    videoTitle: string;
    version?: string;
    status?: string;
}) {
    const [thumbError, setThumbError] = useState(false);

    return (
        <div
            className="relative w-full h-full overflow-hidden bg-muted rounded-t-2xl"
        >
            {thumbnailUrl && !thumbError ? (
                <Image
                    src={thumbnailUrl}
                    alt={videoTitle || "영상 썸네일"}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => setThumbError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="flex flex-col items-center gap-2.5">
                        <div className="relative w-16 h-16 rounded-2xl bg-background/80 flex items-center justify-center shadow-inner">
                            <Play className="w-8 h-8 text-muted-foreground fill-muted-foreground/20" />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-[0.2em] uppercase">No Preview</span>
                    </div>
                </div>
            )}

            {/* Gradient overlay for card content readability */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/60 to-transparent" />

            {/* Play button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    className="w-14 h-14 rounded-full bg-indigo-600/80 border border-border flex items-center justify-center shadow-2xl shadow-indigo-500/30"
                >
                    <Play className="w-6 h-6 text-foreground fill-white ml-0.5" />
                </motion.div>
            </div>

            {/* Version chip */}
            {version && (
                <div className="absolute bottom-3 right-3 z-10">
                    <Badge className="bg-background text-foreground border-border font-mono text-[10px] px-2 py-0.5">
                        v{version.replace(/^v/i, "")}
                    </Badge>
                </div>
            )}
        </div>
    );
}

// ============================================================
//  MAIN DASHBOARD COMPONENT
// ============================================================
export function FeedbackDashboard({ submissions }: { submissions: Submission[] }) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("PENDING");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"latest" | "oldest">("latest");
    const [particlesReady, setParticlesReady] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const bulkActionMutation = useMutation({
        mutationFn: async ({ action, reason }: { action: "APPROVE" | "REJECT"; reason?: string }) => {
            const res = await fetch("/api/submissions/bulk-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds), action, reason }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message ?? "일괄 처리에 실패했습니다.");
            }
            return res.json();
        },
        onSuccess: (data) => {
            const { approved, rejected, failed } = data.data;
            const successCount = approved + rejected;
            if (successCount > 0) {
                toast.success(`${successCount}건 처리되었습니다.`);
            }
            if (failed.length > 0) {
                toast.error(`${failed.length}건 처리 실패`);
            }
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "일괄 처리에 실패했습니다.");
        },
    });

    // Quick approve/reject mutations for single card actions
    const quickApproveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/submissions/${id}/approve`, { method: "PATCH" });
            if (!res.ok) throw new Error("승인에 실패했습니다.");
        },
        onSuccess: () => {
            toast.success("승인되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
        },
        onError: (err: Error) => toast.error(err.message),
    });

    const quickRejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/submissions/${id}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "담당자 반려" }),
            });
            if (!res.ok) throw new Error("반려에 실패했습니다.");
        },
        onSuccess: () => {
            toast.success("반려되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // Removed initParticlesEngine for performance

    const filteredSubmissions = useMemo(() => {
        const result = submissions.filter(s => {
            let matchesFilter = false;
            if (filter === "ALL") matchesFilter = true;
            else if (filter === "COMPLETED") matchesFilter = s.status === "APPROVED" || s.status === "REJECTED" || s.status === "REVISED";
            else matchesFilter = s.status === filter;

            const matchesSearch = !searchQuery ||
                s.video?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.star.chineseName || s.star.name).toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });

        result.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            return sortBy === "latest" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [submissions, filter, searchQuery, sortBy]);

    useEffect(() => {
        // filter 변경 시 선택 초기화
        setSelectedIds(new Set()); // eslint-disable-line react-hooks/set-state-in-effect -- reset on filter change
    }, [filter]);

    // Keyboard shortcut: ⌘K / Ctrl+K to focus search
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                const searchInput = document.getElementById("feedback-search-input");
                searchInput?.focus();
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    const selectableSubmissions = useMemo(() => {
        return filteredSubmissions.filter(s => ["PENDING", "IN_REVIEW", "REVISED"].includes(s.status));
    }, [filteredSubmissions]);

    const isAllSelected = selectableSubmissions.length > 0 && selectableSubmissions.every(s => selectedIds.has(s.id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set(selectedIds);
            selectableSubmissions.forEach(s => newSet.add(s.id));
            setSelectedIds(newSet);
        }
    };

    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleQuickApprove = useCallback((id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        quickApproveMutation.mutate(id);
    }, [quickApproveMutation]);

    const handleQuickReject = useCallback((id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        quickRejectMutation.mutate(id);
    }, [quickRejectMutation]);

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

    // Recent activity summary
    const recentActivity = useMemo(() => {
        const todaySubmitted = submissions.filter(s => isToday(new Date(s.createdAt))).length;
        const todayApproved = submissions.filter(s => s.status === "APPROVED" && isToday(new Date(s.createdAt))).length;
        return { todaySubmitted, todayApproved };
    }, [submissions]);

    // Determine which stat has the highest count for pulse ring effect
    const highestStatKey = useMemo(() => {
        const statValues = [
            { key: "total", value: stats.total },
            { key: "pending", value: stats.pending },
            { key: "inReview", value: stats.inReview },
            { key: "completed", value: stats.completed },
        ];
        const max = statValues.reduce((a, b) => (a.value >= b.value ? a : b));
        return max.value > 0 ? max.key : null;
    }, [stats]);

    // Per-group stats helper
    const getGroupStats = useCallback((subs: Submission[]) => {
        const pending = subs.filter(s => s.status === "PENDING").length;
        const inReview = subs.filter(s => s.status === "IN_REVIEW").length;
        const completed = subs.filter(s => s.status === "APPROVED" || s.status === "REJECTED" || s.status === "REVISED").length;
        return { pending, inReview, completed };
    }, []);

    return (
        <div className="space-y-8">

            {/* ======================== HEADER ======================== */}
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-4xl font-black tracking-tight"
                    >
                        담당 피드백{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
                            작성
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-muted-foreground mt-1.5 max-w-lg"
                    >
                        담당 STAR들의 영상이 여기에 모여있어요. 카드를 기울이고 클릭해서 피드백 우주로!
                    </motion.p>
                    {/* Recent activity summary */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                            오늘 {recentActivity.todaySubmitted}건 제출
                            {recentActivity.todayApproved > 0 && `, ${recentActivity.todayApproved}건 승인`}
                        </span>
                    </motion.div>
                </div>

                {/* Stats Orbs */}
                <div className="flex gap-3 sm:gap-4 flex-wrap">
                    {[
                        { label: "전체", value: stats.total, gradient: "from-slate-500 to-slate-400", icon: TrendingUp, iconColor: "text-slate-500", statKey: "total" },
                        { label: "대기중", value: stats.pending, gradient: "from-amber-500 to-orange-400", icon: Clock, iconColor: "text-amber-500", statKey: "pending" },
                        { label: "피드백중", value: stats.inReview, gradient: "from-indigo-500 to-purple-400", icon: Zap, iconColor: "text-indigo-500", statKey: "inReview" },
                        { label: "승인/반려", value: stats.completed, gradient: "from-emerald-500 to-teal-400", icon: CheckCircle2, iconColor: "text-emerald-500", statKey: "completed" }
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 220 }}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl",
                                "bg-card border border-border",
                                "hover:bg-muted transition-all duration-300 hover:scale-105 shadow-sm"
                            )}
                        >
                            {/* Animated pulse ring on highest stat */}
                            {highestStatKey === stat.statKey && stat.value > 0 && (
                                <div className="absolute inset-[-2px] rounded-2xl border-2 border-current opacity-20 animate-pulse" style={{ color: "var(--color-primary)" }} />
                            )}
                            <stat.icon className={cn("w-4 h-4 mb-1", stat.iconColor)} />
                            <span className={cn("text-xl sm:text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent", stat.gradient)}>{stat.value}</span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{stat.label}</span>
                        </motion.div>
                    ))}
                </div>
            </header>

            {/* ======================== FILTER BAR ======================== */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3 rounded-2xl bg-card border border-border shadow-sm"
            >
                <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                        {FILTERS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "relative px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                    filter === tab.key ? "text-foreground" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
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
                                        filter === tab.key ? "bg-accent" : "bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400"
                                    )}>
                                        {tab.key === "PENDING" ? stats.pending : tab.key === "IN_REVIEW" ? stats.inReview : stats.completed}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center px-2 mr-2">
                            <Checkbox
                                id="select-all"
                                checked={isAllSelected}
                                onCheckedChange={toggleSelectAll}
                                disabled={selectableSubmissions.length === 0}
                                className="mr-2"
                            />
                            <label htmlFor="select-all" className="text-sm font-medium text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                                부분 일괄선택
                            </label>
                        </div>

                        <div className="relative flex-1 sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-600" />
                            <input
                                id="feedback-search-input"
                                type="text"
                                placeholder="영상 제목, STAR 이름 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-16 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground"
                            />
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded">
                                ⌘K
                            </kbd>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm hover:bg-accent transition-colors text-muted-foreground font-medium whitespace-nowrap">
                                    <ArrowUpDown className="w-4 h-4" />
                                    <span className="text-slate-400 dark:text-slate-500 text-xs">정렬</span>
                                    <span className="hidden sm:inline">{sortBy === "latest" ? "최신순" : "오래된순"}</span>
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
                        {groupedSubmissions.map((group) => {
                            const groupStats = getGroupStats(group.submissions);
                            return (
                                <motion.div
                                    key={group.star.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4 }}
                                    className="flex flex-col gap-5"
                                >
                                    {/* Group Header (STAR Info) — Enhanced with per-group stats */}
                                    <div className="flex items-center gap-4 px-2">
                                        <Avatar className="w-12 h-12 border-2 border-background shadow-md ring-2 ring-primary/20">
                                            <AvatarImage src={group.star.avatarUrl || undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-foreground font-bold text-lg">
                                                {(group.star.chineseName || group.star.name)[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                                                {group.star.chineseName || group.star.name}
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                    {group.submissions.length}개의 영상
                                                </span>
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <p className="text-sm text-muted-foreground">{group.star.email}</p>
                                                <div className="flex items-center gap-1.5">
                                                    {groupStats.pending > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {groupStats.pending}건 대기
                                                        </span>
                                                    )}
                                                    {groupStats.inReview > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                                                            <Eye className="w-2.5 h-2.5" />
                                                            {groupStats.inReview}건 피드백중
                                                        </span>
                                                    )}
                                                    {groupStats.completed > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                                            {groupStats.completed}건 완료
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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
                                            const canQuickAction = isPending || isInReview || sub.status === "REVISED";

                                            return (
                                                <div key={sub.id} className="snap-start shrink-0 w-[280px] sm:w-[300px] perspective-1000">
                                                    <Link href={`/admin/reviews/my/${sub.id}`} prefetch={false} className="block group/card w-full h-full">
                                                        <div className="w-full h-full relative transition-all duration-300 ease-out transform-gpu group-hover/card:-translate-y-1 group-hover/card:shadow-md rounded-2xl">
                                                            <div className={cn(
                                                                "relative w-full h-full rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col",
                                                                "bg-card shadow-sm",
                                                                isPending && "border-amber-300/50 dark:border-amber-500/30 group-hover/card:border-amber-400",
                                                                isInReview && "border-indigo-300/50 dark:border-indigo-500/30 group-hover/card:border-indigo-400",
                                                                isApproved && "border-emerald-300/50 dark:border-emerald-500/30 group-hover/card:border-emerald-400",
                                                                isRejected && "border-rose-300/50 dark:border-rose-500/30 group-hover/card:border-rose-400",
                                                                !isPending && !isInReview && !isApproved && !isRejected && "border-border group-hover/card:border-primary/30"
                                                            )}>

                                                                {/* Status Indicator overlapping thumbnail */}
                                                                <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
                                                                    {isPending && (
                                                                        <Badge className="bg-amber-400/90 text-amber-950 border-none shadow-lg shadow-amber-500/20 text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                            <Clock className="w-3 h-3 mr-1" />대기중
                                                                        </Badge>
                                                                    )}
                                                                    {isInReview && (
                                                                        <Badge className="bg-indigo-500/90 text-foreground border-none shadow-lg shadow-indigo-500/30 text-[10px] font-bold tracking-wide animate-pulse px-2 py-0.5">
                                                                            <Eye className="w-3 h-3 mr-1" />피드백중
                                                                        </Badge>
                                                                    )}
                                                                    {isApproved && (
                                                                        <Badge className="bg-emerald-500/90 text-foreground border-none shadow-lg shadow-emerald-500/20 text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                            <CheckCircle2 className="w-3 h-3 mr-1" />승인됨
                                                                        </Badge>
                                                                    )}
                                                                    {isRejected && (
                                                                        <Badge className="bg-rose-500/90 text-foreground border-none shadow-lg shadow-rose-500/20 text-[10px] font-bold tracking-wide px-2 py-0.5">
                                                                            <AlertTriangle className="w-3 h-3 mr-1" />반려됨
                                                                        </Badge>
                                                                    )}
                                                                </div>

                                                                {/* Selection Checkbox */}
                                                                {["PENDING", "IN_REVIEW", "REVISED"].includes(sub.status) && (
                                                                    <div
                                                                        className="absolute top-3 right-3 z-30"
                                                                        onClick={(e) => toggleSelect(sub.id, e)}
                                                                    >
                                                                        <Checkbox
                                                                            checked={selectedIds.has(sub.id)}
                                                                            className="w-5 h-5 border-2 bg-card border-indigo-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 outline-none ring-0 shadow-lg cursor-pointer"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Thumbnail Layer - slightly shorter aspect ratio for compact look */}
                                                                <div className="aspect-[16/10] shrink-0">
                                                                    <ThumbnailPreview
                                                                        thumbnailUrl={getStaticThumb(sub)}
                                                                        videoTitle={sub.video?.title || sub.assignment?.request?.title || sub.versionTitle || ""}
                                                                        version={sub.version}
                                                                    />
                                                                </div>

                                                                {/* Content Layer - Compact Padding */}
                                                                <div className="p-4 flex flex-col grow justify-between">
                                                                    <div>
                                                                        {/* Title */}
                                                                        <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 mb-2 group-hover/card:text-primary transition-colors">
                                                                            {sub.video?.title || sub.assignment?.request?.title || sub.versionTitle || "제목 없음"}
                                                                        </h3>

                                                                        {/* Description Snippet (Hidden on very small cards) */}
                                                                        {sub.video?.description && (
                                                                            <p className="text-[11px] text-muted-foreground line-clamp-1 mb-3">
                                                                                {sub.video.description}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="mt-auto pt-2 flex items-center justify-between">
                                                                        {/* Time Info */}
                                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                                                                            <Clock className="w-3 h-3" />
                                                                            {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true, locale: ko })}
                                                                        </div>
                                                                        {/* Action / Feedback count — Enhanced pill */}
                                                                        {feedbackCount > 0 ? (
                                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-400/20">
                                                                                <MessageSquare className="w-3 h-3" />
                                                                                <span>{feedbackCount}건</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-all">
                                                                                <ArrowRight className="w-3 h-3 transition-transform group-hover/card:translate-x-0.5" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Quick Action Overlay — appears on hover for actionable cards */}
                                                                {canQuickAction && (
                                                                    <div className="absolute bottom-0 inset-x-0 z-30 opacity-0 translate-y-1 group-hover/card:opacity-100 group-hover/card:translate-y-0 transition-all duration-200 pointer-events-none group-hover/card:pointer-events-auto">
                                                                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-t from-card via-card/95 to-transparent rounded-b-2xl">
                                                                            <button
                                                                                onClick={(e) => handleQuickApprove(sub.id, e)}
                                                                                disabled={quickApproveMutation.isPending}
                                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                                            >
                                                                                <Check className="w-3.5 h-3.5" />
                                                                                승인
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => handleQuickReject(sub.id, e)}
                                                                                disabled={quickRejectMutation.isPending}
                                                                                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-full shadow-lg shadow-rose-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                                반려
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredSubmissions.length === 0 && (
                    <EmptyState
                        preset="no-results"
                        description={filter !== "ALL" ? "필터를 변경해보세요." : "담당 STAR의 영상이 아직 없습니다."}
                    />
                )}

            {/* Floating Bulk Action Bar — Enhanced with gradient border and deselect button */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        transition={{ type: "spring", bounce: 0.2 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className="flex items-center gap-3 px-6 py-4 bg-card/95 backdrop-blur-xl border border-border rounded-full shadow-xl">
                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold">
                                    {selectedIds.size}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">건 선택</span>
                                <div className="w-px h-6 bg-border" />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full px-4 font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    onClick={() => setSelectedIds(new Set())}
                                >
                                    선택 해제
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-foreground rounded-full px-6 font-bold shadow-lg shadow-emerald-500/20"
                                    onClick={() => bulkActionMutation.mutate({ action: "APPROVE" })}
                                    disabled={bulkActionMutation.isPending}
                                >
                                    일괄 승인
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-full px-6 font-bold shadow-lg shadow-red-500/20"
                                    onClick={() => {
                                        const reason = window.prompt("일괄 반려 사유를 입력해주세요.", "담당자 일괄 반려");
                                        if (reason !== null) {
                                            bulkActionMutation.mutate({ action: "REJECT", reason });
                                        }
                                    }}
                                    disabled={bulkActionMutation.isPending}
                                >
                                    일괄 반려
                                </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
