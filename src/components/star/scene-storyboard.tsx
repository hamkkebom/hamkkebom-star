"use client";

import { useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFeedbackViewStore, type FeedbackScene } from "@/store/feedback-view-store";
import { Brush, MessageSquare, AlertTriangle } from "lucide-react";

interface SceneStoryboardProps {
    onSceneClick: (startTime: number) => void;
}

export function SceneStoryboard({ onSceneClick }: SceneStoryboardProps) {
    const scenes = useFeedbackViewStore((s) => s.scenes);
    const currentTime = useFeedbackViewStore((s) => s.currentTime);
    const feedbacks = useFeedbackViewStore((s) => s.feedbacks); // eslint-disable-line @typescript-eslint/no-unused-vars
    const selectedFeedbackId = useFeedbackViewStore((s) => s.selectedFeedbackId);
    const setSelectedFeedbackId = useFeedbackViewStore((s) => s.setSelectedFeedbackId);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        dragFree: false,
        containScroll: "trimSnaps",
        align: "start",
        slidesToScroll: 1,
    });

    // 현재 재생 시간에 따른 활성 장면 인덱스
    const activeIndex = scenes.findIndex(
        (s) => s.startTime >= 0 && currentTime >= s.startTime && currentTime <= s.endTime + 2
    );

    // 활성 장면이 변경되면 캐러셀 자동 스크롤
    useEffect(() => {
        if (!emblaApi || activeIndex < 0) return;
        emblaApi.scrollTo(activeIndex);
    }, [activeIndex, emblaApi]);

    const handleSceneClick = useCallback(
        (scene: FeedbackScene, _index: number) => {
            if (scene.startTime < 0) return; // 타임코드 없는 그룹
            onSceneClick(scene.startTime);
            // 첫 번째 피드백 선택
            if (scene.feedbackIds.length > 0) {
                setSelectedFeedbackId(scene.feedbackIds[0]);
            }
        },
        [onSceneClick, setSelectedFeedbackId]
    );

    if (scenes.length === 0) return null;

    // 타임코드가 있는 장면만 표시
    const timecodedScenes = scenes.filter((s) => s.startTime >= 0);

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    📸 <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">장면별 피드백</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {timecodedScenes.length}개 장면
                    </span>
                </h3>
            </div>

            {/* Embla Carousel */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-3">
                    {timecodedScenes.map((scene, i) => {
                        const isActive = i === activeIndex;
                        const fbCount = scene.feedbackIds.length;
                        const isUrgent = scene.priority === "HIGH";

                        // 이 장면에 선택된 피드백이 포함되어 있는지
                        const hasSelectedFb = selectedFeedbackId
                            ? scene.feedbackIds.includes(selectedFeedbackId)
                            : false;

                        return (
                            <motion.div
                                key={`scene-${i}`}
                                className="flex-none"
                                animate={{
                                    scale: isActive || hasSelectedFb ? 1.05 : 1,
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            >
                                <button
                                    onClick={() => handleSceneClick(scene, i)}
                                    className={cn(
                                        "relative w-36 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-300 group/scene",
                                        isActive || hasSelectedFb
                                            ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                            : "border-white/10 hover:border-white/20",
                                        isUrgent && !isActive && "border-red-500/40"
                                    )}
                                >
                                    {/* Gradient Background (대체 썸네일) */}
                                    <div className={cn(
                                        "absolute inset-0 transition-all duration-500",
                                        isActive
                                            ? "bg-gradient-to-br from-indigo-900/80 to-violet-900/80"
                                            : "bg-gradient-to-br from-slate-900 to-slate-800 group-hover/scene:from-slate-800 group-hover/scene:to-slate-700"
                                    )} />

                                    {/* Timecode Badge */}
                                    <div className="absolute top-2 left-2 z-10">
                                        <span className={cn(
                                            "text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold tabular-nums",
                                            isActive
                                                ? "bg-indigo-500 text-white"
                                                : "bg-black/50 text-white/80 backdrop-blur-sm"
                                        )}>
                                            {formatTime(scene.startTime)}
                                        </span>
                                    </div>

                                    {/* Badges: 상단 오른쪽 */}
                                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                                        {isUrgent && (
                                            <span className="flex items-center gap-0.5 bg-red-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                                <AlertTriangle className="w-2.5 h-2.5" /> 긴급
                                            </span>
                                        )}
                                    </div>

                                    {/* Bottom Info */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare className="w-3 h-3 text-blue-400" />
                                                <span className="text-[10px] font-bold text-white">{fbCount}</span>
                                            </div>
                                            {scene.hasAnnotation && (
                                                <div className="flex items-center gap-1 bg-indigo-500/20 px-1.5 py-0.5 rounded-full">
                                                    <Brush className="w-2.5 h-2.5 text-indigo-400" />
                                                    <span className="text-[9px] text-indigo-300 font-bold">드로잉</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Pulse */}
                                    {isActive && (
                                        <div className="absolute inset-0 border-2 border-indigo-400 rounded-2xl animate-pulse opacity-50" />
                                    )}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
