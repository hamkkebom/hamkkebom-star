"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Clock, Eye, CheckCircle2, LayoutGrid, Inbox, X,
    ChevronDown, Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileReviewItem, type MobileReviewItemData } from "./mobile-review-item";
import type { Submission } from "@/types/feedback-workspace";

// ============================================================
//  CONSTANTS
// ============================================================

const FILTERS = [
    { key: "ALL", label: "전체", icon: LayoutGrid },
    { key: "PENDING", label: "대기중", icon: Clock },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye },
    { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2 },
] as const;

const FILTER_STATUSES: Record<string, string[]> = {
    ALL: [],
    PENDING: ["PENDING"],
    IN_REVIEW: ["IN_REVIEW"],
    COMPLETED: ["APPROVED", "REJECTED", "REVISED"],
};

// ============================================================
//  HELPERS
// ============================================================

function getInitials(name: string) {
    return name.slice(0, 2).toUpperCase();
}

function submissionToItemData(sub: Submission, detailBase: string): MobileReviewItemData {
    return {
        id: sub.id,
        projectTitle:
            sub.versionTitle ||
            sub.assignment?.request?.title ||
            sub.video?.title ||
            `v${sub.version.replace(/^v/i, "")}`,
        starName: sub.star.chineseName ?? sub.star.name,
        version: sub.version,
        status: sub.status as MobileReviewItemData["status"],
        createdAt: sub.createdAt,
        thumbnailUrl: sub.signedThumbnailUrl ?? null,
        feedbackCount: sub._count?.feedbacks ?? 0,
        detailHref: `${detailBase}/${sub.id}`,
    };
}

// ============================================================
//  TYPES
// ============================================================

type StarGroup = {
    starId: string;
    starName: string;
    starDisplayName: string;
    avatarUrl: string | null;
    latestTime: number;
    pendingCount: number;
    inReviewCount: number;
    items: MobileReviewItemData[];
};

// ============================================================
//  COMPONENT
// ============================================================

export function MobileGroupedReviewList({
    submissions,
    queryKey = ["my-reviews"],
    detailBase = "/admin/reviews/my",
}: {
    submissions: Submission[];
    queryKey?: string[];
    detailBase?: string;
}) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<string>("ALL");
    const [search, setSearch] = useState("");
    const [collapsedStars, setCollapsedStars] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const isSelectMode = selectedIds.size > 0;

    // ── Mutations ──
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/submissions/${id}/approve`, { method: "PATCH" });
            if (!res.ok) {
                const err = await res.json() as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "승인에 실패했습니다.");
            }
        },
        onSuccess: () => {
            toast.success("승인되었습니다.");
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/submissions/${id}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "관리자 반려" }),
            });
            if (!res.ok) {
                const err = await res.json() as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "반려에 실패했습니다.");
            }
        },
        onSuccess: () => {
            toast.success("반려되었습니다.");
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const bulkMutation = useMutation({
        mutationFn: async ({ action, reason }: { action: "APPROVE" | "REJECT"; reason?: string }) => {
            const res = await fetch("/api/submissions/bulk-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds), action, reason }),
            });
            if (!res.ok) {
                const err = await res.json() as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "일괄 처리에 실패했습니다.");
            }
            return res.json();
        },
        onSuccess: (data) => {
            const count = (data.data?.approved ?? 0) + (data.data?.rejected ?? 0);
            toast.success(`${count}건 처리되었습니다.`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    // ── Toggle handlers ──
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const toggleCollapse = useCallback((starId: string) => {
        setCollapsedStars(prev => {
            const next = new Set(prev);
            if (next.has(starId)) next.delete(starId); else next.add(starId);
            return next;
        });
    }, []);

    // ── Stats ──
    const stats = useMemo(() => ({
        total: submissions.length,
        pending: submissions.filter(s => s.status === "PENDING").length,
        inReview: submissions.filter(s => s.status === "IN_REVIEW").length,
        completed: submissions.filter(s => ["APPROVED", "REJECTED", "REVISED"].includes(s.status)).length,
    }), [submissions]);

    // ── Filtered groups ──
    const groups = useMemo((): StarGroup[] => {
        const statuses = FILTER_STATUSES[filter] ?? [];
        const searchLower = search.trim().toLowerCase();

        const filtered = submissions.filter(sub => {
            const matchesStatus = statuses.length === 0 || statuses.includes(sub.status);
            if (!matchesStatus) return false;
            if (searchLower) {
                const name = (sub.star.chineseName ?? sub.star.name).toLowerCase();
                const title = (sub.versionTitle ?? sub.assignment?.request?.title ?? sub.video?.title ?? "").toLowerCase();
                return name.includes(searchLower) || title.includes(searchLower);
            }
            return true;
        });

        // Group by star
        const map = new Map<string, StarGroup>();
        for (const sub of filtered) {
            const starId = sub.star.id;
            const existing = map.get(starId);
            const itemData = submissionToItemData(sub, detailBase);
            if (existing) {
                existing.items.push(itemData);
                if (sub.status === "PENDING") existing.pendingCount++;
                if (sub.status === "IN_REVIEW") existing.inReviewCount++;
                const t = new Date(sub.createdAt).getTime();
                if (t > existing.latestTime) existing.latestTime = t;
            } else {
                map.set(starId, {
                    starId,
                    starName: sub.star.name,
                    starDisplayName: sub.star.chineseName ?? sub.star.name,
                    avatarUrl: sub.star.avatarUrl,
                    latestTime: new Date(sub.createdAt).getTime(),
                    pendingCount: sub.status === "PENDING" ? 1 : 0,
                    inReviewCount: sub.status === "IN_REVIEW" ? 1 : 0,
                    items: [itemData],
                });
            }
        }

        return Array.from(map.values()).sort((a, b) => b.latestTime - a.latestTime);
    }, [submissions, filter, search, detailBase]);

    const statCount = (key: string) => {
        if (key === "PENDING") return stats.pending;
        if (key === "IN_REVIEW") return stats.inReview;
        if (key === "COMPLETED") return stats.completed;
        return stats.total;
    };

    // ============================================================
    //  RENDER
    // ============================================================
    return (
        <div className="block md:hidden">
            {/* ── Sticky header: search + filter tabs ── */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
                {/* Search bar */}
                <div className="px-3 pt-2 pb-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="이름 또는 프로젝트 검색..."
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-muted border border-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/50"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex overflow-x-auto scrollbar-none px-3 py-2 gap-1.5">
                    {FILTERS.map(tab => {
                        const isActive = filter === tab.key;
                        const Icon = tab.icon;
                        const count = statCount(tab.key);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { setFilter(tab.key); setSelectedIds(new Set()); }}
                                className={cn(
                                    "flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <Icon className="w-3 h-3" />
                                {tab.label}
                                <span className={cn(
                                    "inline-flex items-center justify-center min-w-[16px] px-1 py-0.5 rounded-full text-[9px] font-black",
                                    isActive ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Select mode header ── */}
            <AnimatePresence>
                {isSelectMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-indigo-50/80 dark:bg-indigo-500/10 border-b border-indigo-200/50 dark:border-indigo-500/20"
                    >
                        <div className="flex items-center justify-between px-4 py-2">
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                                {selectedIds.size}건 선택됨 · 길게 눌러 추가 선택
                            </span>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-indigo-500 dark:text-indigo-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Group list ── */}
            {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">
                        {search ? "검색 결과가 없습니다" : "항목이 없습니다"}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                        {search ? "다른 검색어를 입력해보세요" : "다른 필터 탭을 선택해보세요"}
                    </p>
                </div>
            ) : (
                <div className="pb-28">
                    {groups.map((group, gi) => {
                        const isCollapsed = collapsedStars.has(group.starId);
                        return (
                            <motion.div
                                key={group.starId}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(gi * 0.04, 0.2) }}
                            >
                                {/* Group header */}
                                <button
                                    onClick={() => toggleCollapse(group.starId)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 dark:bg-muted/20 border-b border-border active:bg-muted/70 transition-colors"
                                >
                                    <Avatar className="w-8 h-8 shrink-0">
                                        {group.avatarUrl && (
                                            <AvatarImage src={group.avatarUrl} alt={group.starDisplayName} />
                                        )}
                                        <AvatarFallback className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400">
                                            {getInitials(group.starDisplayName)}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-bold truncate">{group.starDisplayName}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{group.starName}</p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {group.pendingCount > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                                <Clock className="w-2.5 h-2.5" />
                                                {group.pendingCount}
                                            </span>
                                        )}
                                        {group.inReviewCount > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                                                <Eye className="w-2.5 h-2.5" />
                                                {group.inReviewCount}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            총 {group.items.length}건
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                                isCollapsed && "-rotate-90"
                                            )}
                                        />
                                    </div>
                                </button>

                                {/* Group items */}
                                <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                        <motion.div
                                            key="items"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            {group.items.map((item) => (
                                                <MobileReviewItem
                                                    key={item.id}
                                                    item={item}
                                                    isSelected={selectedIds.has(item.id)}
                                                    isSelectMode={isSelectMode}
                                                    onSelect={toggleSelect}
                                                    onApprove={(id) => approveMutation.mutate(id)}
                                                    onReject={(id) => rejectMutation.mutate(id)}
                                                    isApproving={approveMutation.isPending}
                                                    isRejecting={rejectMutation.isPending}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Floating bulk action bar ── */}
            <AnimatePresence>
                {isSelectMode && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="fixed bottom-6 left-4 right-4 z-50"
                    >
                        <div className="flex items-center gap-2 px-4 py-3 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/10">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-black">
                                    {selectedIds.size}
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">건 선택</span>
                            </div>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="ml-auto flex gap-2">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-xl h-8 px-4 text-xs font-bold"
                                    onClick={() => bulkMutation.mutate({ action: "REJECT", reason: "관리자 일괄 반려" })}
                                    disabled={bulkMutation.isPending}
                                >
                                    일괄 반려
                                </Button>
                                <Button
                                    size="sm"
                                    className="rounded-xl h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20"
                                    onClick={() => bulkMutation.mutate({ action: "APPROVE" })}
                                    disabled={bulkMutation.isPending}
                                >
                                    일괄 승인
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
