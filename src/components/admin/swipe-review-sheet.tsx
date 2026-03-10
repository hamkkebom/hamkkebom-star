"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { CheckCircle2, XCircle, SkipForward, ChevronDown, Grip } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { VideoPlayer } from "@/components/video/video-player";
import { Button } from "@/components/ui/button";

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
};

interface SwipeReviewSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: SwipeReviewItem[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onViewDetail: (id: string) => void;
}

export function SwipeReviewSheet({
    open,
    onOpenChange,
    items,
    onApprove,
    onReject,
    onViewDetail,
}: SwipeReviewSheetProps) {
    const [deck, setDeck] = useState(items);
    const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
    const [exitDirection, setExitDirection] = useState<number>(0);
    const [rejectReason, setRejectReason] = useState("");

    React.useEffect(() => {
        setDeck(items);
    }, [items]);

    const currentItem = deck[0] ?? null;

    const handleDragEnd = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (!currentItem) return;
            const threshold = 120;

            if (info.offset.x > threshold) {
                // 승인
                setExitDirection(1);
                setTimeout(() => {
                    onApprove(currentItem.id);
                    setDeck((prev) => prev.slice(1));
                    setExitDirection(0);
                    setSwipeDirection(null);
                }, 200);
            } else if (info.offset.x < -threshold) {
                // 반려
                setExitDirection(-1);
                setTimeout(() => {
                    onReject(currentItem.id);
                    setDeck((prev) => prev.slice(1));
                    setExitDirection(0);
                    setSwipeDirection(null);
                    setRejectReason("");
                }, 200);
            } else {
                setSwipeDirection(null);
            }
        },
        [currentItem, onApprove, onReject]
    );

    const handleDrag = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.x > 40) {
                setSwipeDirection("right");
            } else if (info.offset.x < -40) {
                setSwipeDirection("left");
            } else {
                setSwipeDirection(null);
            }
        },
        []
    );

    const handleSkip = useCallback(() => {
        setDeck((prev) => prev.slice(1));
        setSwipeDirection(null);
        setRejectReason("");
    }, []);

    const handleManualApprove = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(1);
        setTimeout(() => {
            onApprove(currentItem.id);
            setDeck((prev) => prev.slice(1));
            setExitDirection(0);
        }, 200);
    }, [currentItem, onApprove]);

    const handleManualReject = useCallback(() => {
        if (!currentItem) return;
        setExitDirection(-1);
        setTimeout(() => {
            onReject(currentItem.id);
            setDeck((prev) => prev.slice(1));
            setExitDirection(0);
            setRejectReason("");
        }, 200);
    }, [currentItem, onReject]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="h-[92dvh] rounded-t-[28px] p-0 overflow-hidden flex flex-col"
            >
                {/* 드래그 핸들 */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* 헤더 */}
                <SheetHeader className="px-5 pb-2 pt-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-lg font-black">
                                스와이프 심사
                            </SheetTitle>
                            <SheetDescription className="text-xs">
                                {deck.length}건 대기 중 · 좌우로 스와이프하여 처리
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

                {/* 카드 영역 */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {!currentItem ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <p className="text-xl font-black text-foreground mb-1">
                                모두 완료! 🎉
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
                                            <div className="bg-emerald-500 text-white rounded-full p-6 shadow-2xl shadow-emerald-500/30">
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
                                            <div className="bg-rose-500 text-white rounded-full p-6 shadow-2xl shadow-rose-500/30">
                                                <XCircle className="w-12 h-12" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* 영상 영역 */}
                                <div className="w-full bg-black" style={{ height: 240 }}>
                                    {currentItem.streamUid ? (
                                        <VideoPlayer
                                            streamUid={currentItem.streamUid}
                                            autoPlay
                                            muted
                                            loop
                                            controls
                                            className="w-full h-[240px] bg-black [&>stream]:w-full [&>stream]:h-full [&>stream]:!max-h-none [&_iframe]:!max-h-none [&_iframe]:!h-[240px]"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-500">
                                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                                                </svg>
                                                <span className="text-xs">영상 없음</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 정보 영역 */}
                                <div className="p-4 space-y-3">
                                    {/* 상태 뱃지 */}
                                    <div className="flex justify-between items-center">
                                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold">
                                            대기중
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[11px] font-bold text-slate-500">
                                            V{currentItem.version.replace(/^v/i, "")}
                                        </span>
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

                                    {/* 스타 정보 */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-sm font-bold">
                                            {currentItem.starName}
                                        </p>
                                        <span className="text-xs text-muted-foreground">·</span>
                                        <p className="text-xs text-muted-foreground">
                                            {currentItem.createdAt}
                                        </p>
                                    </div>

                                    {/* 스와이프 가이드 */}
                                    <div className="flex items-center justify-between pt-3">
                                        <div className="flex items-center gap-1.5 text-rose-500">
                                            <XCircle className="w-4 h-4" />
                                            <span className="text-xs font-bold">← 반려</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Grip className="w-4 h-4 text-muted-foreground/40" />
                                            <span className="text-[10px] text-muted-foreground/60 font-medium">
                                                스와이프
                                            </span>
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
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all font-bold h-11 shadow-lg shadow-emerald-500/20"
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
                                        상세 페이지에서 피드백 작성 →
                                    </Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

                    {/* 남은 카드 수 인디케이터 */}
                    {currentItem && deck.length > 1 && (
                        <div className="flex justify-center mt-4">
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                {deck.slice(0, Math.min(5, deck.length)).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-2 h-2 rounded-full transition-colors ${i === 0
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
            </SheetContent>
        </Sheet>
    );
}
