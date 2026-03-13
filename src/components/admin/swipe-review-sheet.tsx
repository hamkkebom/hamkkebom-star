"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
    CheckCircle2, XCircle, SkipForward, ChevronDown, Grip,
    Hand, LayoutList, MessageSquare, Clock, Send, Loader2,
    Tag, Flag, Play, Film, X as XIcon,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { VideoPlayer } from "@/components/video/video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FeedbackType, FeedbackPriority } from "@/types/feedback-workspace";
import {
    FEEDBACK_TYPES, PRIORITY_OPTIONS,
    TYPE_LABELS, TYPE_COLORS, PRIORITY_BADGE,
    formatTime,
} from "@/types/feedback-workspace";

// ============================================================
//  TYPES
// ============================================================

export type SwipeReviewItem = {
    id: string;
    projectTitle: string;
    subTitle?: string;
    starName: string;
    starEmail: string;
    version: string;
    streamUid?: string;
    thumbnailUrl?: string;
    createdAt: string;
    status: string;
    feedbackCount?: number;
};

type ViewMode = "swipe" | "list";

interface SwipeReviewSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: SwipeReviewItem[];
    allItems?: SwipeReviewItem[];
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    onViewDetail: (id: string) => void;
    currentFilter?: string;
}

// ============================================================
//  LIST MODE ITEM
// ============================================================

function ListModeItem({
    item,
    onApprove,
    onReject,
    onFeedback,
}: {
    item: SwipeReviewItem;
    onApprove: () => void;
    onReject: () => void;
    onFeedback: () => void;
}) {
    const [thumbError, setThumbError] = useState(false);
    const thumbUrl = item.thumbnailUrl || null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
        >
            {/* 썸네일 */}
            <div className="w-14 h-8 rounded-lg bg-black overflow-hidden shrink-0">
                {thumbUrl && !thumbError ? (
                    <img
                        src={thumbUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setThumbError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-3.5 h-3.5 text-white/30" />
                    </div>
                )}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.projectTitle}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{item.starName}</span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                        v{item.version.replace(/^v/i, "")}
                    </span>
                    {(item.feedbackCount ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-indigo-500 text-[10px]">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {item.feedbackCount}
                        </span>
                    )}
                </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={onFeedback}
                    title="피드백 작성"
                    className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center active:scale-95 transition-all"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onReject}
                    title="반려"
                    className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-95 transition-all"
                >
                    <XIcon className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onApprove}
                    title="승인"
                    className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center active:scale-95 transition-all"
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </motion.div>
    );
}

// ============================================================
//  MAIN COMPONENT
// ============================================================

export function SwipeReviewSheet({
    open,
    onOpenChange,
    items,
    allItems,
    onApprove,
    onReject,
    onViewDetail: _onViewDetail,
}: SwipeReviewSheetProps) {
    const queryClient = useQueryClient();

    // ── View state ──
    const [viewMode, setViewMode] = useState<ViewMode>("swipe");
    const [feedbackMode, setFeedbackMode] = useState(false);

    // ── Swipe deck ──
    const [deck, setDeck] = useState(items);
    const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
    const [exitDirection, setExitDirection] = useState<number>(0);

    // ── Reject reason inline ──
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const rejectInputRef = useRef<HTMLInputElement>(null);

    // ── Video time tracking ──
    const [currentTime, setCurrentTime] = useState(0);
    const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);

    // ── Feedback form state ──
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackType, setFeedbackType] = useState<FeedbackType>("GENERAL");
    const [feedbackPriority, setFeedbackPriority] = useState<FeedbackPriority>("NORMAL");
    const [capturedTime, setCapturedTime] = useState<number | null>(null);
    const [isTimeCaptured, setIsTimeCaptured] = useState(false);

    React.useEffect(() => {
        setDeck(items);
    }, [items]);

    const currentItem = deck[0] ?? null;

    // ── Reset feedback form ──
    const resetFeedbackForm = useCallback(() => {
        setFeedbackText("");
        setFeedbackType("GENERAL");
        setFeedbackPriority("NORMAL");
        setCapturedTime(null);
        setIsTimeCaptured(false);
    }, []);

    // ── Feedback mutation ──
    const createFeedbackMutation = useMutation({
        mutationFn: async () => {
            if (!currentItem) throw new Error("선택된 항목이 없습니다.");
            const res = await fetch("/api/feedbacks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submissionId: currentItem.id,
                    content: feedbackText.trim(),
                    type: feedbackType,
                    priority: feedbackPriority,
                    startTime: isTimeCaptured && capturedTime !== null ? capturedTime : undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error((err as { error?: { message?: string } }).error?.message ?? "피드백 등록에 실패했습니다.");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("피드백이 등록되었습니다.");
            resetFeedbackForm();
            setFeedbackMode(false);
            if (currentItem) {
                setDeck(prev => prev.map(item =>
                    item.id === currentItem.id
                        ? { ...item, feedbackCount: (item.feedbackCount ?? 0) + 1 }
                        : item
                ));
            }
            queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "피드백 등록에 실패했습니다.");
        },
    });

    // ── Swipe handlers ──
    const handleDragEnd = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (!currentItem) return;
            const threshold = 120;
            if (info.offset.x > threshold) {
                setExitDirection(1);
                setTimeout(() => {
                    onApprove(currentItem.id);
                    setDeck(prev => prev.slice(1));
                    setExitDirection(0);
                    setSwipeDirection(null);
                    resetFeedbackForm();
                    setFeedbackMode(false);
                    setShowRejectInput(false);
                    setRejectReason("");
                }, 200);
            } else if (info.offset.x < -threshold) {
                setExitDirection(-1);
                setTimeout(() => {
                    onReject(currentItem.id, rejectReason.trim() || "관리자 반려");
                    setDeck(prev => prev.slice(1));
                    setExitDirection(0);
                    setSwipeDirection(null);
                    resetFeedbackForm();
                    setFeedbackMode(false);
                    setShowRejectInput(false);
                    setRejectReason("");
                }, 200);
            } else {
                setSwipeDirection(null);
            }
        },
        [currentItem, onApprove, onReject, rejectReason, resetFeedbackForm]
    );

    const handleDrag = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.x > 40) setSwipeDirection("right");
            else if (info.offset.x < -40) setSwipeDirection("left");
            else setSwipeDirection(null);
        },
        []
    );

    const handleSkip = useCallback(() => {
        setDeck(prev => prev.slice(1));
        setSwipeDirection(null);
        resetFeedbackForm();
        setFeedbackMode(false);
        setShowRejectInput(false);
        setRejectReason("");
    }, [resetFeedbackForm]);

    const handleManualApprove = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(1);
        setTimeout(() => {
            onApprove(currentItem.id);
            setDeck(prev => prev.slice(1));
            setExitDirection(0);
            resetFeedbackForm();
            setFeedbackMode(false);
            setShowRejectInput(false);
            setRejectReason("");
        }, 200);
    }, [currentItem, onApprove, resetFeedbackForm]);

    const handleManualReject = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(-1);
        setTimeout(() => {
            onReject(currentItem.id, rejectReason.trim() || "관리자 반려");
            setDeck(prev => prev.slice(1));
            setExitDirection(0);
            resetFeedbackForm();
            setFeedbackMode(false);
            setShowRejectInput(false);
            setRejectReason("");
        }, 200);
    }, [currentItem, onReject, rejectReason, resetFeedbackForm]);

    // ── List mode handlers ──
    const handleListApprove = useCallback((id: string) => {
        onApprove(id);
        setDeck(prev => prev.filter(item => item.id !== id));
    }, [onApprove]);

    const handleListReject = useCallback((id: string) => {
        onReject(id, "관리자 반려");
        setDeck(prev => prev.filter(item => item.id !== id));
    }, [onReject]);

    const handleListFeedback = useCallback((id: string) => {
        const existing = deck.find(d => d.id === id);
        const target = existing ?? allItems?.find(a => a.id === id);
        if (!target) return;
        setDeck(prev => {
            const idx = prev.findIndex(d => d.id === id);
            if (idx < 0) return [target, ...prev];
            if (idx === 0) return prev;
            const newDeck = [...prev];
            const [item] = newDeck.splice(idx, 1);
            newDeck.unshift(item);
            return newDeck;
        });
        setViewMode("swipe");
        setTimeout(() => setFeedbackMode(true), 150);
    }, [deck, allItems]);

    // ── Sheet open/close ──
    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            setFeedbackMode(false);
            resetFeedbackForm();
            setShowRejectInput(false);
            setRejectReason("");
        }
        onOpenChange(open);
    }, [onOpenChange, resetFeedbackForm]);

    const listItems = allItems ?? deck;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="h-[92dvh] rounded-t-[28px] p-0 overflow-hidden flex flex-col"
            >
                {/* ── 드래그 핸들 ── */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* ── 헤더 ── */}
                <SheetHeader className="px-4 pb-2 pt-0 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* 제목 */}
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-base font-black">
                                {viewMode === "swipe" ? "스와이프 심사" : "전체 목록"}
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {viewMode === "swipe"
                                    ? `${deck.length}건 대기 중 · 좌우로 스와이프하여 처리`
                                    : `${listItems.length}건 · 각 항목에서 승인/반려`}
                            </SheetDescription>
                        </div>

                        {/* 뷰 모드 토글 */}
                        <div className="flex items-center bg-muted rounded-xl p-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => { setViewMode("swipe"); setFeedbackMode(false); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    viewMode === "swipe"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Hand className="w-3 h-3" />
                                스와이프
                            </button>
                            <button
                                type="button"
                                onClick={() => { setViewMode("list"); setFeedbackMode(false); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    viewMode === "list"
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutList className="w-3 h-3" />
                                목록
                            </button>
                        </div>

                        {/* 닫기 */}
                        <button
                            type="button"
                            onClick={() => handleOpenChange(false)}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                </SheetHeader>

                {/* ── 메인 콘텐츠 ── */}
                <div className="flex-1 overflow-y-auto">

                    {/* ════════ SWIPE MODE ════════ */}
                    {viewMode === "swipe" && (
                        <div className="px-4 pb-8">
                            {!currentItem ? (
                                /* 완료 상태 */
                                <div className="flex flex-col items-center justify-center h-[60vh] text-center text-muted-foreground">
                                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <p className="text-xl font-black text-foreground mb-1">모두 완료! 🎉</p>
                                    <p className="text-sm">대기 중인 심사가 없습니다.</p>
                                    <Button variant="outline" className="mt-6 rounded-xl" onClick={() => handleOpenChange(false)}>
                                        닫기
                                    </Button>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentItem.id}
                                        className="relative rounded-[20px] overflow-hidden bg-card border border-border shadow-xl"
                                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                        animate={{
                                            opacity: exitDirection !== 0 ? 0 : 1,
                                            x: exitDirection * 400,
                                            rotate: exitDirection * 15,
                                            y: 0,
                                            scale: 1,
                                        }}
                                        exit={{ opacity: 0, x: exitDirection * 400, rotate: exitDirection * 15 }}
                                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                                        drag={feedbackMode ? false : "x"}
                                        dragConstraints={{ left: 0, right: 0 }}
                                        dragElastic={0.8}
                                        onDrag={feedbackMode ? undefined : handleDrag}
                                        onDragEnd={feedbackMode ? undefined : handleDragEnd}
                                    >
                                        {/* ── 스와이프 오버레이 (승인/반려 시각 피드백) ── */}
                                        <AnimatePresence>
                                            {swipeDirection === "right" && !feedbackMode && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 bg-emerald-500/20 z-20 flex items-center justify-center pointer-events-none"
                                                >
                                                    <div className="bg-emerald-500 text-white rounded-full p-6 shadow-2xl shadow-emerald-500/30">
                                                        <CheckCircle2 className="w-12 h-12" />
                                                    </div>
                                                </motion.div>
                                            )}
                                            {swipeDirection === "left" && !feedbackMode && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute inset-0 bg-rose-500/20 z-20 flex items-center justify-center pointer-events-none"
                                                >
                                                    <div className="bg-rose-500 text-white rounded-full p-6 shadow-2xl shadow-rose-500/30">
                                                        <XCircle className="w-12 h-12" />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* ── 영상 영역 (항상 마운트 — 절대 언마운트 하지 않음) ── */}
                                        <div className="relative w-full bg-black" style={{ height: 240 }}>
                                            {currentItem.streamUid ? (
                                                <VideoPlayer
                                                    streamUid={currentItem.streamUid}
                                                    autoPlay
                                                    muted
                                                    loop
                                                    controls
                                                    onTimeUpdate={handleTimeUpdate}
                                                    className="w-full h-[240px] bg-black [&>stream]:w-full [&>stream]:h-full [&>stream]:!max-h-none [&_iframe]:!max-h-none [&_iframe]:!h-[240px]"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-2 text-slate-500">
                                                        <Film className="w-10 h-10" />
                                                        <span className="text-xs">영상 없음</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* 피드백 모드일 때 iframe 터치 이벤트 차단막 */}
                                            {feedbackMode && (
                                                <div className="absolute inset-0 z-10 bg-transparent" />
                                            )}
                                        </div>

                                        {/* ── 카드 정보 ── */}
                                        <div className="p-4 space-y-3">
                                            {/* 상태 + 버전 */}
                                            <div className="flex justify-between items-center">
                                                <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold">
                                                    대기중
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {(currentItem.feedbackCount ?? 0) > 0 && (
                                                        <span className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                                            <MessageSquare className="w-3 h-3" />
                                                            {currentItem.feedbackCount}
                                                        </span>
                                                    )}
                                                    <span className="bg-muted px-3 py-1 rounded-full text-[11px] font-bold text-muted-foreground">
                                                        V{currentItem.version.replace(/^v/i, "")}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 제목 */}
                                            <h3 className="text-lg font-black leading-snug text-foreground line-clamp-2">
                                                {currentItem.projectTitle}
                                            </h3>
                                            {currentItem.subTitle && (
                                                <p className="text-sm text-muted-foreground line-clamp-1 -mt-1">
                                                    {currentItem.subTitle}
                                                </p>
                                            )}

                                            {/* STAR 정보 */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                                                <p className="text-sm font-bold">{currentItem.starName}</p>
                                                <span className="text-xs text-muted-foreground">·</span>
                                                <p className="text-xs text-muted-foreground">{currentItem.createdAt}</p>
                                            </div>

                                            {/* 스와이프 가이드 */}
                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-1.5 text-rose-500">
                                                    <XIcon className="w-4 h-4" />
                                                    <span className="text-xs font-bold">← 반려</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Grip className="w-4 h-4 text-muted-foreground/40" />
                                                    <span className="text-[10px] text-muted-foreground/60 font-medium">스와이프</span>
                                                    <Grip className="w-4 h-4 text-muted-foreground/40" />
                                                </div>
                                                <div className="flex items-center gap-1.5 text-emerald-500">
                                                    <span className="text-xs font-bold">승인 →</span>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── 반려 사유 인라인 입력 ── */}
                                        <AnimatePresence>
                                            {showRejectInput && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden px-4 pb-3"
                                                >
                                                    <div className="flex gap-2">
                                                        <input
                                                            ref={rejectInputRef}
                                                            type="text"
                                                            value={rejectReason}
                                                            onChange={e => setRejectReason(e.target.value)}
                                                            placeholder="반려 사유 (선택, Enter로 확정)"
                                                            className="flex-1 text-sm bg-muted border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground placeholder:text-muted-foreground"
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") {
                                                                    handleManualReject();
                                                                    setShowRejectInput(false);
                                                                }
                                                                if (e.key === "Escape") {
                                                                    setShowRejectInput(false);
                                                                    setRejectReason("");
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onPointerDown={(e) => e.stopPropagation()}
                                                            onClick={() => {
                                                                handleManualReject();
                                                                setShowRejectInput(false);
                                                            }}
                                                            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-all"
                                                        >
                                                            확정
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* ── 메인 액션 버튼 ── */}
                                        <div className="p-4 pt-0 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn(
                                                        "flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950 active:scale-95 transition-all font-bold h-11 rounded-xl",
                                                        showRejectInput && "bg-rose-50 dark:bg-rose-950"
                                                    )}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={() => {
                                                        setShowRejectInput(v => !v);
                                                        if (!showRejectInput) {
                                                            setTimeout(() => rejectInputRef.current?.focus(), 100);
                                                        }
                                                    }}
                                                >
                                                    <XIcon className="w-4 h-4 mr-1.5" />
                                                    반려
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground active:scale-95 transition-all h-11 px-3 rounded-xl"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={handleSkip}
                                                >
                                                    <SkipForward className="w-4 h-4 mr-1" />
                                                    건너뛰기
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/20"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={handleManualApprove}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                    승인
                                                </Button>
                                            </div>

                                            {/* ⭐ 피드백 작성 버튼 — 핵심 변경 */}
                                            <button
                                                type="button"
                                                onClick={() => setFeedbackMode(true)}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-[0.98] transition-all"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                피드백 작성
                                                {(currentItem.feedbackCount ?? 0) > 0 && (
                                                    <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                                        {currentItem.feedbackCount}
                                                    </span>
                                                )}
                                            </button>
                                        </div>

                                        {/* ════ 피드백 오버레이 ════
                                             absolute inset-0 → 카드 전체를 덮음
                                             VideoPlayer는 이 div 밖에 있지 않고 같은 카드 내에 있으므로
                                             DOM에서 제거되지 않음 → 영상 재생 유지됨 */}
                                        <AnimatePresence>
                                            {feedbackMode && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                                                    className="absolute inset-0 z-30 bg-background/98 backdrop-blur-md overflow-y-auto rounded-[20px]"
                                                >
                                                    {/* 오버레이 헤더 */}
                                                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b border-border flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setFeedbackMode(false); resetFeedbackForm(); }}
                                                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-black">피드백 작성</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                스와이프 심사 진행 중 · 영상 재생 유지됨
                                                            </p>
                                                        </div>
                                                        {/* 실시간 타임코드 */}
                                                        <div className="bg-black/80 dark:bg-white/10 text-white text-xs px-2 py-1 rounded-full font-mono flex items-center gap-1 shrink-0">
                                                            <Play className="w-2.5 h-2.5" />
                                                            {formatTime(currentTime)}
                                                        </div>
                                                    </div>

                                                    {/* 영상 컨텍스트 미리보기 */}
                                                    <div className="px-4 py-3 bg-muted/30 border-b border-border">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-16 h-9 rounded-lg bg-black overflow-hidden shrink-0">
                                                                {currentItem.thumbnailUrl ? (
                                                                    <img
                                                                        src={currentItem.thumbnailUrl}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                        onError={e => {
                                                                            (e.target as HTMLImageElement).style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Film className="w-4 h-4 text-white/40" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold truncate">{currentItem.projectTitle}</p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {currentItem.starName} · v{currentItem.version.replace(/^v/i, "")}
                                                                </p>
                                                            </div>
                                                            {/* 재생 중 표시 */}
                                                            <div className="shrink-0 flex items-center gap-1 text-emerald-500">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[10px] font-bold">재생중</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 피드백 폼 */}
                                                    <div className="px-4 py-4 space-y-4">

                                                        {/* 피드백 유형 */}
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                                <Tag className="w-3 h-3" /> 유형
                                                            </label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {FEEDBACK_TYPES.map(ft => {
                                                                    const Icon = ft.icon;
                                                                    const isActive = feedbackType === ft.value;
                                                                    return (
                                                                        <button
                                                                            key={ft.value}
                                                                            type="button"
                                                                            onClick={() => setFeedbackType(ft.value)}
                                                                            className={cn(
                                                                                "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                                                                                isActive
                                                                                    ? `${ft.color} ring-1 ring-current/20 shadow-sm`
                                                                                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                                                                            )}
                                                                        >
                                                                            <Icon className="w-3 h-3" />
                                                                            {ft.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* 우선순위 */}
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                                                <Flag className="w-3 h-3" /> 우선순위
                                                            </label>
                                                            <div className="flex gap-1.5">
                                                                {PRIORITY_OPTIONS.map(pr => {
                                                                    const isActive = feedbackPriority === pr.value;
                                                                    return (
                                                                        <button
                                                                            key={pr.value}
                                                                            type="button"
                                                                            onClick={() => setFeedbackPriority(pr.value)}
                                                                            className={cn(
                                                                                "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                                                                                isActive
                                                                                    ? `${pr.color} border-current/20 bg-current/5`
                                                                                    : "border-border bg-muted/50 text-muted-foreground"
                                                                            )}
                                                                        >
                                                                            <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? pr.dot : "bg-muted-foreground/40")} />
                                                                            {pr.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* 타임코드 캡처 */}
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setCapturedTime(currentTime); setIsTimeCaptured(true); }}
                                                                className={cn(
                                                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                                                                    isTimeCaptured
                                                                        ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                                                                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                                                                )}
                                                            >
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {isTimeCaptured && capturedTime !== null
                                                                    ? `${formatTime(capturedTime)} 캡처됨`
                                                                    : `현재 시점 캡처 (${formatTime(currentTime)})`}
                                                            </button>
                                                            {isTimeCaptured && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setCapturedTime(null); setIsTimeCaptured(false); }}
                                                                    className="w-10 h-10 rounded-xl border border-border bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                                >
                                                                    <XIcon className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* 텍스트에리어 */}
                                                        <Textarea
                                                            value={feedbackText}
                                                            onChange={e => setFeedbackText(e.target.value)}
                                                            placeholder="피드백 내용을 작성하세요..."
                                                            className="min-h-[100px] bg-muted/50 border-border resize-none text-sm rounded-xl"
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    if (feedbackText.trim()) createFeedbackMutation.mutate();
                                                                }
                                                            }}
                                                        />

                                                        {/* 상태 요약 뱃지 */}
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Badge className={cn("text-[9px] h-5 border", TYPE_COLORS[feedbackType])}>
                                                                {TYPE_LABELS[feedbackType]}
                                                            </Badge>
                                                            <Badge className={cn("text-[9px] h-5 border", PRIORITY_BADGE[feedbackPriority])}>
                                                                {PRIORITY_OPTIONS.find(p => p.value === feedbackPriority)?.label}
                                                            </Badge>
                                                            {isTimeCaptured && capturedTime !== null && (
                                                                <Badge className="text-[9px] h-5 border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                                                                    {formatTime(capturedTime)}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* 등록 버튼 */}
                                                        <Button
                                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white h-12 font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 border-0"
                                                            onClick={() => createFeedbackMutation.mutate()}
                                                            disabled={!feedbackText.trim() || createFeedbackMutation.isPending}
                                                        >
                                                            {createFeedbackMutation.isPending
                                                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />등록 중...</>
                                                                : <><Send className="w-4 h-4 mr-2" />피드백 등록</>}
                                                        </Button>

                                                        <p className="text-center text-[11px] text-muted-foreground">
                                                            등록 후 스와이프 심사가 자동으로 재개됩니다.
                                                        </p>
                                                    </div>

                                                    {/* 하단 safe area */}
                                                    <div className="h-6" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                    </motion.div>
                                </AnimatePresence>
                            )}

                            {/* 남은 카드 인디케이터 */}
                            {currentItem && deck.length > 1 && (
                                <div className="flex justify-center mt-4">
                                    <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                                        {deck.slice(0, Math.min(5, deck.length)).map((_, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-2 h-2 rounded-full transition-colors",
                                                    i === 0 ? "bg-violet-500" : "bg-border"
                                                )}
                                            />
                                        ))}
                                        {deck.length > 5 && (
                                            <span className="text-[10px] font-bold text-muted-foreground ml-1">
                                                +{deck.length - 5}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════════ LIST MODE ════════ */}
                    {viewMode === "list" && (
                        <div className="px-4 pb-8">
                            {listItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[40vh] text-center text-muted-foreground">
                                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                                        <Film className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <p className="font-semibold">항목이 없습니다</p>
                                </div>
                            ) : (
                                <div className="space-y-2 pt-2">
                                    <AnimatePresence>
                                        {listItems.map(item => (
                                            <ListModeItem
                                                key={item.id}
                                                item={item}
                                                onApprove={() => handleListApprove(item.id)}
                                                onReject={() => handleListReject(item.id)}
                                                onFeedback={() => handleListFeedback(item.id)}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </SheetContent>
        </Sheet>
    );
}
