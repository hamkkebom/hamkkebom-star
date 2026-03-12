"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { CheckCircle2, XCircle, Volume2, VolumeX, SkipForward } from "lucide-react";
import { SubmissionStatus } from "@/generated/prisma/client";
import { VideoPlayer } from "@/components/video/video-player";

export type SwipeableItem = {
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

interface SwipeableReviewDeckProps {
    items: SwipeableItem[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onViewDetail: (id: string) => void;
}

export function SwipeableReviewDeck({ items, onApprove, onReject, onViewDetail }: SwipeableReviewDeckProps) {
    const [deck, setDeck] = useState(items);

    React.useEffect(() => {
        setDeck(items);
    }, [items]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, item: SwipeableItem) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onApprove(item.id);
            setDeck((prev) => prev.filter((i) => i.id !== item.id));
        } else if (info.offset.x < -threshold) {
            onReject(item.id);
            setDeck((prev) => prev.filter((i) => i.id !== item.id));
        }
    };

    const handleSkip = (item: SwipeableItem) => {
        setDeck((prev) => prev.filter((i) => i.id !== item.id));
    };

    if (deck.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-2xl">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-50" />
                </div>
                <p className="font-medium text-lg text-slate-900 dark:text-foreground">모든 심사가 완료되었습니다!</p>
                <p className="text-sm">더 이상 대기 중인 영상이 없습니다.</p>
            </div>
        );
    }

    const visibleItems = deck.slice(0, 3).reverse();

    return (
        <div className="relative w-full flex flex-col items-center" style={{ minHeight: 520 }}>
            <AnimatePresence>
                {visibleItems.map((item, index) => {
                    const isTop = index === visibleItems.length - 1;

                    return (
                        <motion.div
                            key={item.id}
                            className="absolute w-full max-w-sm rounded-[28px] overflow-hidden bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col"
                            style={{
                                zIndex: index,
                                transformOrigin: "bottom",
                            }}
                            initial={{ scale: 0.95, y: 30, opacity: 0 }}
                            animate={{
                                scale: isTop ? 1 : 1 - (visibleItems.length - 1 - index) * 0.05,
                                y: isTop ? 0 : (visibleItems.length - 1 - index) * 20,
                                opacity: 1,
                            }}
                            exit={{ opacity: 0, x: 300, transition: { duration: 0.3 } }}
                            drag={isTop ? "x" : false}
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.8}
                            onDragEnd={(e, info) => isTop && handleDragEnd(e, info, item)}
                        >
                            {/* ──── 영상 영역 (natural flow, NOT absolute) ──── */}
                            <div className="w-full bg-black rounded-t-[28px] overflow-hidden" style={{ height: 280 }}>
                                {isTop ? (
                                    item.streamUid ? (
                                        <VideoPlayer
                                            streamUid={item.streamUid}
                                            autoPlay
                                            muted
                                            loop
                                            controls
                                            className="w-full h-[280px] bg-black [&>stream]:w-full [&>stream]:h-full [&>stream]:!max-h-none [&_iframe]:!max-h-none [&_iframe]:!h-[280px]"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-10 h-10 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>
                                                <span className="text-slate-500 text-xs">영상 없음</span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full h-full bg-slate-800/80 flex items-center justify-center">
                                        <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>
                                    </div>
                                )}
                            </div>

                            {/* ──── 정보 영역 ──── */}
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-[11px] font-bold">
                                        대기중
                                    </div>
                                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[11px] font-bold text-slate-500">
                                        V{item.version.replace(/^v/i, "")}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black leading-snug text-slate-900 dark:text-foreground line-clamp-2 mb-1">
                                    {item.projectTitle}
                                </h3>
                                {item.subTitle && (
                                    <p className="text-slate-500 text-sm font-medium line-clamp-1 mb-2">
                                        {item.subTitle}
                                    </p>
                                )}

                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                    <p className="text-sm font-bold text-slate-800 dark:text-foreground">
                                        {item.starName}
                                    </p>
                                    <span className="text-xs text-slate-400">·</span>
                                    <p className="text-xs text-slate-400">
                                        {item.createdAt}
                                    </p>
                                </div>
                            </div>

                            {/* ──── 하단 액션 바 ──── */}
                            <div className="h-[64px] bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between px-5 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col items-center opacity-60 w-10">
                                    <XCircle className="w-6 h-6 text-rose-500" />
                                    <span className="text-[8px] font-bold text-rose-500 mt-0.5">반려</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="pointer-events-auto bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3.5 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform flex items-center gap-1"
                                        onClick={() => handleSkip(item)}
                                    >
                                        <SkipForward className="w-3.5 h-3.5" />
                                        건너뛰기
                                    </button>
                                    <button
                                        className="pointer-events-auto bg-slate-900 dark:bg-white text-foreground dark:text-slate-900 px-3.5 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform shadow-md"
                                        onClick={() => onViewDetail(item.id)}
                                    >
                                        상세 보기
                                    </button>
                                </div>

                                <div className="flex flex-col items-center opacity-60 w-10">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    <span className="text-[8px] font-bold text-emerald-500 mt-0.5">승인</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
