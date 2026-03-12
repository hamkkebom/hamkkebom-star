"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
    CheckCircle2, XCircle, SkipForward, ChevronDown, Grip,
    Clock, MessageSquare, Send, Loader2, Tag, Flag, Play,
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

export type FeedbackSwipeItem = {
    id: string;
    projectTitle: string;
    subTitle?: string;
    starName: string;
    starEmail: string;
    version: string;
    streamUid?: string;
    createdAt: string;
    status: string;
    feedbackCount: number;
};

interface FeedbackSwipeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: FeedbackSwipeItem[];
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    onViewDetail: (id: string) => void;
}

// ============================================================
//  COMPONENT
// ============================================================

export function FeedbackSwipeSheet({
    open,
    onOpenChange,
    items,
    onApprove,
    onReject,
    onViewDetail,
}: FeedbackSwipeSheetProps) {
    const queryClient = useQueryClient();
    const [deck, setDeck] = useState(items);
    const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
    const [exitDirection, setExitDirection] = useState<number>(0);

    // Feedback form state
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackType, setFeedbackType] = useState<FeedbackType>("GENERAL");
    const [feedbackPriority, setFeedbackPriority] = useState<FeedbackPriority>("NORMAL");
    const [currentTime, setCurrentTime] = useState(0);
    const [capturedTime, setCapturedTime] = useState<number | null>(null);
    const [isTimeCaptured, setIsTimeCaptured] = useState(false);

    // Expanded feedback section toggle
    const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);

    React.useEffect(() => {
        setDeck(items);
    }, [items]);

    const currentItem = deck[0] ?? null;

    // Reset feedback form when moving to next card
    const resetFeedbackForm = useCallback(() => {
        setFeedbackText("");
        setFeedbackType("GENERAL");
        setFeedbackPriority("NORMAL");
        setCapturedTime(null);
        setIsTimeCaptured(false);
        setIsFeedbackExpanded(false);
    }, []);

    // Feedback creation mutation
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
                throw new Error(err.error?.message ?? "피드백 등록에 실패했습니다.");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("피드백이 등록되었습니다.");
            setFeedbackText("");
            setCapturedTime(null);
            setIsTimeCaptured(false);
            // Update feedback count in deck
            if (currentItem) {
                setDeck(prev => prev.map(item =>
                    item.id === currentItem.id
                        ? { ...item, feedbackCount: item.feedbackCount + 1 }
                        : item
                ));
            }
            queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
            queryClient.invalidateQueries({ queryKey: ["feedbacks", currentItem?.id] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "피드백 등록에 실패했습니다.");
        },
    });

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
                }, 200);
            } else if (info.offset.x < -threshold) {
                setExitDirection(-1);
                setTimeout(() => {
                    onReject(currentItem.id, feedbackText.trim() || "관리자 반려");
                    setDeck(prev => prev.slice(1));
                    setExitDirection(0);
                    setSwipeDirection(null);
                    resetFeedbackForm();
                }, 200);
            } else {
                setSwipeDirection(null);
            }
        },
        [currentItem, onApprove, onReject, feedbackText, resetFeedbackForm]
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
    }, [resetFeedbackForm]);

    const handleManualApprove = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(1);
        setTimeout(() => {
            onApprove(currentItem.id);
            setDeck(prev => prev.slice(1));
            setExitDirection(0);
            resetFeedbackForm();
        }, 200);
    }, [currentItem, onApprove, resetFeedbackForm]);

    const handleManualReject = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(-1);
        setTimeout(() => {
            onReject(currentItem.id, feedbackText.trim() || "관리자 반려");
            setDeck(prev => prev.slice(1));
            setExitDirection(0);
            resetFeedbackForm();
        }, 200);
    }, [currentItem, onReject, feedbackText, resetFeedbackForm]);

    const handleCaptureTime = useCallback(() => {
        setCapturedTime(currentTime);
        setIsTimeCaptured(true);
    }, [currentTime]);

    const handleTimeUpdate = useCallback((t: number) => {
        setCurrentTime(t);
    }, []);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="h-[95dvh] rounded-t-[28px] p-0 overflow-hidden flex flex-col"
            >
                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* 헤더 */}
                <SheetHeader className="px-5 pb-2 pt-0 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-lg font-black">
                                담당 피드백 심사
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {deck.length}건 대기 중 · 피드백 작성 후 승인/반려
                            </SheetDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => onOpenChange(false)}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </Button>
                    </div>
                </SheetHeader>

                {/* 카드 + 피드백 영역 */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {!currentItem ? (
                        /* 완료 상태 */
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <p className="text-xl font-black text-foreground mb-1">
                                모두 완료!
                            </p>
                            <p className="text-sm">대기 중인 심사가 없습니다.</p>
                            <Button
                                variant="outline"
                                className="mt-6"
                                onClick={() => onOpenChange(false)}
                            >
                                닫기
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* ──── 스와이프 카드 ──── */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentItem.id}
                                    className="relative rounded-[20px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl"
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
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.8}
                                    onDrag={handleDrag}
                                    onDragEnd={handleDragEnd}
                                >
                                    {/* 스와이프 오버레이 */}
                                    <AnimatePresence>
                                        {swipeDirection === "right" && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-emerald-500/20 z-20 flex items-center justify-center pointer-events-none"
                                            >
                                                <div className="bg-emerald-500 text-foreground rounded-full p-6 shadow-2xl shadow-emerald-500/30">
                                                    <CheckCircle2 className="w-12 h-12" />
                                                </div>
                                            </motion.div>
                                        )}
                                        {swipeDirection === "left" && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-rose-500/20 z-20 flex items-center justify-center pointer-events-none"
                                            >
                                                <div className="bg-rose-500 text-foreground rounded-full p-6 shadow-2xl shadow-rose-500/30">
                                                    <XCircle className="w-12 h-12" />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* 영상 영역 */}
                                    <div className="w-full bg-black" style={{ height: 220 }}>
                                        {currentItem.streamUid ? (
                                            <VideoPlayer
                                                streamUid={currentItem.streamUid}
                                                autoPlay
                                                muted
                                                loop
                                                controls
                                                onTimeUpdate={handleTimeUpdate}
                                                className="w-full h-[220px] bg-black [&>stream]:w-full [&>stream]:h-full [&>stream]:!max-h-none [&_iframe]:!max-h-none [&_iframe]:!h-[220px]"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-500">
                                                    <Play className="w-10 h-10" />
                                                    <span className="text-xs">영상 없음</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 정보 영역 */}
                                    <div className="p-4 space-y-2.5">
                                        <div className="flex justify-between items-center">
                                            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold">
                                                대기중
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {currentItem.feedbackCount > 0 && (
                                                    <span className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                                        <MessageSquare className="w-3 h-3" />
                                                        {currentItem.feedbackCount}
                                                    </span>
                                                )}
                                                <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[11px] font-bold text-slate-500">
                                                    V{currentItem.version.replace(/^v/i, "")}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-black leading-snug text-foreground line-clamp-2">
                                            {currentItem.projectTitle}
                                        </h3>
                                        {currentItem.subTitle && (
                                            <p className="text-sm text-muted-foreground line-clamp-1 -mt-1">
                                                {currentItem.subTitle}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <p className="text-sm font-bold">{currentItem.starName}</p>
                                            <span className="text-xs text-muted-foreground">·</span>
                                            <p className="text-xs text-muted-foreground">{currentItem.createdAt}</p>
                                        </div>

                                        {/* 스와이프 가이드 */}
                                        <div className="flex items-center justify-between pt-2">
                                            <div className="flex items-center gap-1.5 text-rose-500">
                                                <XCircle className="w-4 h-4" />
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

                                    {/* 하단 액션 버튼 */}
                                    <div className="flex items-center gap-2 p-4 pt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950 active:scale-95 transition-all font-bold h-11"
                                            onClick={handleManualReject}
                                        >
                                            <XCircle className="w-4 h-4 mr-1.5" />
                                            반려
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground active:scale-95 transition-all h-11"
                                            onClick={handleSkip}
                                        >
                                            <SkipForward className="w-4 h-4 mr-1" />
                                            건너뛰기
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-foreground active:scale-95 transition-all font-bold h-11 shadow-lg shadow-emerald-500/20"
                                            onClick={handleManualApprove}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            승인
                                        </Button>
                                    </div>

                                    {/* 상세 보기 */}
                                    <div className="px-4 pb-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-muted-foreground text-xs"
                                            onClick={() => {
                                                onViewDetail(currentItem.id);
                                                onOpenChange(false);
                                            }}
                                        >
                                            상세 워크스페이스에서 피드백 작성 →
                                        </Button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* ──── 인라인 피드백 작성 영역 ──── */}
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                {/* 토글 헤더 */}
                                <button
                                    onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <MessageSquare className="w-3.5 h-3.5 text-foreground" />
                                        </div>
                                        <span className="text-sm font-bold text-foreground">빠른 피드백 작성</span>
                                        {currentItem && currentItem.feedbackCount > 0 && (
                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                {currentItem.feedbackCount}건 등록됨
                                            </Badge>
                                        )}
                                    </div>
                                    <ChevronDown className={cn(
                                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                                        isFeedbackExpanded && "rotate-180"
                                    )} />
                                </button>

                                {/* 피드백 폼 (접힘/펼침) */}
                                <AnimatePresence>
                                    {isFeedbackExpanded && currentItem && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                                {/* 피드백 유형 칩 */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                        <Tag className="w-3 h-3" /> 유형
                                                    </label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {FEEDBACK_TYPES.map(ft => {
                                                            const Icon = ft.icon;
                                                            const isActive = feedbackType === ft.value;
                                                            return (
                                                                <button
                                                                    key={ft.value}
                                                                    onClick={() => setFeedbackType(ft.value)}
                                                                    className={cn(
                                                                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                                                                        isActive
                                                                            ? `${ft.color} ring-1 ring-current/20 shadow-sm`
                                                                            : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400 dark:hover:bg-secondary/50"
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
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                                        <Flag className="w-3 h-3" /> 우선순위
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                        {PRIORITY_OPTIONS.map(pr => {
                                                            const isActive = feedbackPriority === pr.value;
                                                            return (
                                                                <button
                                                                    key={pr.value}
                                                                    onClick={() => setFeedbackPriority(pr.value)}
                                                                    className={cn(
                                                                        "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold border transition-all",
                                                                        isActive
                                                                            ? `${pr.color} border-current/20 bg-current/5`
                                                                            : "border-slate-200 bg-slate-50 text-slate-500 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400"
                                                                    )}
                                                                >
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? pr.dot : "bg-slate-400")} />
                                                                    {pr.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 타임스탬프 캡처 */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleCaptureTime}
                                                        className={cn(
                                                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                                                            isTimeCaptured
                                                                ? "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                                                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-border/50 dark:bg-secondary/30 dark:text-slate-400"
                                                        )}
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {isTimeCaptured && capturedTime !== null
                                                            ? `${formatTime(capturedTime)} 캡처됨`
                                                            : `현재 시점 캡처 (${formatTime(currentTime)})`}
                                                    </button>
                                                    {isTimeCaptured && (
                                                        <button
                                                            onClick={() => { setCapturedTime(null); setIsTimeCaptured(false); }}
                                                            className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:border-border/50 dark:bg-secondary/30 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* 피드백 내용 */}
                                                <Textarea
                                                    value={feedbackText}
                                                    onChange={(e) => setFeedbackText(e.target.value)}
                                                    placeholder="피드백 내용을 작성하세요..."
                                                    className="min-h-[80px] bg-slate-50 border-slate-200 dark:bg-secondary/30 dark:border-border/50 resize-none text-sm rounded-xl"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if (feedbackText.trim()) createFeedbackMutation.mutate();
                                                        }
                                                    }}
                                                />

                                                {/* 현재 폼 상태 요약 + 등록 버튼 */}
                                                <div className="space-y-2">
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
                                                    <Button
                                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-foreground shadow-lg shadow-indigo-600/20 border-0 h-10 font-bold text-sm rounded-xl"
                                                        onClick={() => createFeedbackMutation.mutate()}
                                                        disabled={!feedbackText.trim() || createFeedbackMutation.isPending}
                                                    >
                                                        {createFeedbackMutation.isPending
                                                            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 등록 중...</>
                                                            : <><Send className="w-4 h-4 mr-2" /> 피드백 등록</>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 남은 카드 수 인디케이터 */}
                            {deck.length > 1 && (
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                        {deck.slice(0, Math.min(5, deck.length)).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full transition-colors ${
                                                    i === 0
                                                        ? "bg-violet-500"
                                                        : "bg-slate-300 dark:bg-slate-600"
                                                }`}
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
                </div>
            </SheetContent>
        </Sheet>
    );
}
