"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Eye, CheckCircle2, LayoutGrid, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileReviewItem, type MobileReviewItemData } from "./mobile-review-item";

// ============================================================
//  TYPES
// ============================================================

export type MobileSubmissionRow = {
    id: string;
    version: string;
    versionTitle: string | null;
    status: string;
    createdAt: string;
    streamUid?: string | null;
    thumbnailUrl?: string | null;
    star: { id: string; name: string; chineseName: string | null; email: string };
    assignment: { request: { id: string; title: string } } | null;
    video: { title: string; streamUid?: string | null } | null;
    _count: { feedbacks: number };
};

type Stats = {
    total: number;
    pending: number;
    inReview: number;
    completed: number;
};

// ============================================================
//  FILTER CONFIG
// ============================================================

const FILTERS = [
    { key: "PENDING", label: "대기중", icon: Clock },
    { key: "IN_REVIEW", label: "피드백중", icon: Eye },
    { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2 },
    { key: "ALL", label: "전체", icon: LayoutGrid },
] as const;

const FILTER_STATUSES: Record<string, string[]> = {
    PENDING: ["PENDING"],
    IN_REVIEW: ["IN_REVIEW"],
    COMPLETED: ["APPROVED", "REJECTED", "REVISED"],
    ALL: [],
};

// ============================================================
//  COMPONENT
// ============================================================

export function MobileReviewList({
    rows,
    filter,
    onFilterChange,
    stats,
    queryKey = ["admin-submissions"],
}: {
    rows: MobileSubmissionRow[];
    filter: string;
    onFilterChange: (f: string) => void;
    stats: Stats;
    queryKey?: string[];
}) {
    const queryClient = useQueryClient();
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

    // ── Handlers ──
    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    // ── Filtered + mapped items ──
    const items = useMemo((): MobileReviewItemData[] => {
        const statuses = FILTER_STATUSES[filter] ?? [];
        const filtered = statuses.length === 0
            ? rows
            : rows.filter(r => statuses.includes(r.status));

        return filtered.map(r => ({
            id: r.id,
            projectTitle:
                r.versionTitle ||
                r.assignment?.request?.title ||
                r.video?.title ||
                `v${r.version.replace(/^v/i, "")}`,
            starName: r.star.chineseName || r.star.name,
            version: r.version,
            status: r.status as MobileReviewItemData["status"],
            createdAt: r.createdAt,
            thumbnailUrl: r.thumbnailUrl ?? null,
            feedbackCount: r._count.feedbacks,
            detailHref: `/admin/reviews/${r.id}`,
        }));
    }, [rows, filter]);

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
            {/* ── Sticky filter tabs ── */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="flex overflow-x-auto scrollbar-none px-3 py-2 gap-1.5">
                    {FILTERS.map(tab => {
                        const isActive = filter === tab.key;
                        const Icon = tab.icon;
                        const count = statCount(tab.key);
                        return (
                            <button
                                key={tab.key}
                                onClick={() => { onFilterChange(tab.key); setSelectedIds(new Set()); }}
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

            {/* ── List ── */}
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Inbox className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">항목이 없습니다</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">다른 필터 탭을 선택해보세요</p>
                </div>
            ) : (
                <div className="pb-28">
                    {items.map((item, i) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: Math.min(i * 0.025, 0.3), duration: 0.15 }}
                        >
                            <MobileReviewItem
                                item={item}
                                isSelected={selectedIds.has(item.id)}
                                isSelectMode={isSelectMode}
                                onSelect={toggleSelect}
                                onApprove={(id) => approveMutation.mutate(id)}
                                onReject={(id) => rejectMutation.mutate(id)}
                                isApproving={approveMutation.isPending}
                                isRejecting={rejectMutation.isPending}
                            />
                        </motion.div>
                    ))}
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
