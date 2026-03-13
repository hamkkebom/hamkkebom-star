"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, animate, useTransform } from "framer-motion";
import Link from "next/link";
import {
    CheckCircle2, XCircle, MessageSquare, Film,
    Clock, Eye, AlertTriangle, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

// ============================================================
//  TYPES
// ============================================================

export type MobileReviewItemData = {
    id: string;
    projectTitle: string;
    starName: string;
    version: string;
    status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";
    createdAt: string;
    thumbnailUrl?: string | null;
    feedbackCount: number;
    detailHref: string;
};

// ============================================================
//  CONSTANTS
// ============================================================

const ACTIONS_WIDTH = 128; // px — 반려(64) + 승인(64)
const LONG_PRESS_MS = 500;

const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; icon: typeof Clock }
> = {
    PENDING: {
        label: "대기중",
        bg: "bg-amber-100 dark:bg-amber-500/15",
        text: "text-amber-700 dark:text-amber-400",
        icon: Clock,
    },
    IN_REVIEW: {
        label: "피드백중",
        bg: "bg-indigo-100 dark:bg-indigo-500/15",
        text: "text-indigo-700 dark:text-indigo-400",
        icon: Eye,
    },
    APPROVED: {
        label: "승인됨",
        bg: "bg-emerald-100 dark:bg-emerald-500/15",
        text: "text-emerald-700 dark:text-emerald-400",
        icon: CheckCircle2,
    },
    REJECTED: {
        label: "반려됨",
        bg: "bg-rose-100 dark:bg-rose-500/15",
        text: "text-rose-700 dark:text-rose-400",
        icon: XCircle,
    },
    REVISED: {
        label: "수정됨",
        bg: "bg-slate-100 dark:bg-slate-500/15",
        text: "text-slate-700 dark:text-slate-400",
        icon: AlertTriangle,
    },
};

// ============================================================
//  COMPONENT
// ============================================================

export function MobileReviewItem({
    item,
    isSelected,
    isSelectMode,
    onSelect,
    onApprove,
    onReject,
    isApproving = false,
    isRejecting = false,
}: {
    item: MobileReviewItemData;
    isSelected: boolean;
    isSelectMode: boolean;
    onSelect: (id: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    isApproving?: boolean;
    isRejecting?: boolean;
}) {
    const x = useMotionValue(0);
    const [isDragging, setIsDragging] = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPress = useRef(false);
    const dragStartX = useRef(0);

    const canAct = ["PENDING", "IN_REVIEW", "REVISED"].includes(item.status);
    const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
    const StatusIcon = config.icon;

    // Action button opacity — reveals as you swipe left
    const actionOpacity = useTransform(x, [0, -ACTIONS_WIDTH * 0.3, -ACTIONS_WIDTH], [0, 0.5, 1]);
    const rejectScale = useTransform(x, [0, -ACTIONS_WIDTH * 0.5, -ACTIONS_WIDTH], [0.8, 0.9, 1]);
    const approveScale = useTransform(x, [0, -ACTIONS_WIDTH * 0.5, -ACTIONS_WIDTH], [0.8, 0.9, 1]);

    const snapToClosed = useCallback(() => {
        animate(x, 0, { type: "spring", stiffness: 600, damping: 45 });
    }, [x]);

    const snapToOpen = useCallback(() => {
        animate(x, -ACTIONS_WIDTH, { type: "spring", stiffness: 600, damping: 45 });
    }, [x]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        const cur = x.get();
        if (cur < -ACTIONS_WIDTH * 0.35) {
            snapToOpen();
        } else {
            snapToClosed();
        }
    }, [x, snapToOpen, snapToClosed]);

    // Long-press → select mode
    const handlePointerDown = useCallback(() => {
        if (isSelectMode) return;
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            didLongPress.current = true;
            onSelect(item.id);
        }, LONG_PRESS_MS);
    }, [isSelectMode, item.id, onSelect]);

    const handlePointerUp = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const handlePointerCancel = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    return (
        <div className="relative overflow-hidden select-none">
            {/* ── Action buttons (behind) ── */}
            {canAct && (
                <motion.div
                    style={{ width: ACTIONS_WIDTH, opacity: actionOpacity }}
                    className="absolute right-0 top-0 bottom-0 flex"
                >
                    {/* 반려 */}
                    <motion.button
                        style={{ scale: rejectScale }}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => { snapToClosed(); onReject(item.id); }}
                        disabled={isRejecting}
                        className="flex-1 flex flex-col items-center justify-center gap-1 bg-rose-500 text-white active:bg-rose-600 transition-colors disabled:opacity-60"
                    >
                        <XCircle className="w-5 h-5" />
                        <span className="text-[10px] font-bold tracking-wide">반려</span>
                    </motion.button>
                    {/* 승인 */}
                    <motion.button
                        style={{ scale: approveScale }}
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => { snapToClosed(); onApprove(item.id); }}
                        disabled={isApproving}
                        className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-500 text-white active:bg-emerald-600 transition-colors disabled:opacity-60"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold tracking-wide">승인</span>
                    </motion.button>
                </motion.div>
            )}

            {/* ── Foreground row (draggable) ── */}
            <motion.div
                style={{ x }}
                drag={canAct && !isSelectMode ? "x" : false}
                dragDirectionLock
                dragConstraints={{ left: -ACTIONS_WIDTH, right: 8 }}
                dragElastic={{ left: 0.05, right: 0.15 }}
                onDragStart={() => { setIsDragging(true); if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                onDragEnd={handleDragEnd}
                className="relative z-10 bg-card"
            >
                <Link
                    href={item.detailHref}
                    prefetch={false}
                    draggable={false}
                    onClick={(e) => {
                        if (isDragging || didLongPress.current) { e.preventDefault(); return; }
                        if (isSelectMode) { e.preventDefault(); onSelect(item.id); return; }
                        // Close if open before nav
                        if (x.get() < -10) { e.preventDefault(); snapToClosed(); return; }
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    className="flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors"
                >
                    {/* Selection circle */}
                    {isSelectMode && (
                        <div
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(item.id); }}
                            className="shrink-0 w-5 h-5"
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150",
                                isSelected
                                    ? "bg-indigo-600 border-indigo-600"
                                    : "border-border bg-background"
                            )}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                        </div>
                    )}

                    {/* Thumbnail */}
                    <div className="shrink-0 w-[72px] h-[40px] rounded-lg overflow-hidden bg-muted">
                        {item.thumbnailUrl && !thumbError ? (
                            <img
                                src={item.thumbnailUrl}
                                alt=""
                                draggable={false}
                                className="w-full h-full object-cover"
                                onError={() => setThumbError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate leading-snug text-foreground">
                            {item.projectTitle}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="truncate max-w-[80px]">{item.starName}</span>
                            <span className="opacity-40">·</span>
                            <span className="font-mono shrink-0">v{item.version.replace(/^v/i, "")}</span>
                            <span className="opacity-40">·</span>
                            <span className="shrink-0">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
                            </span>
                        </div>
                    </div>

                    {/* Right side: status + feedback */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                            config.bg, config.text
                        )}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {config.label}
                        </span>
                        {item.feedbackCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                                <MessageSquare className="w-2.5 h-2.5" />
                                {item.feedbackCount}
                            </span>
                        )}
                    </div>
                </Link>

                {/* Divider */}
                <div className="h-px bg-border/60 ml-[100px] mr-0" />
            </motion.div>
        </div>
    );
}
