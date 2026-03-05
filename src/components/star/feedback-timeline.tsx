"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useFeedbackViewStore } from "@/store/feedback-view-store";

interface FeedbackTimelineProps {
    onSeek: (time: number) => void;
}

export function FeedbackTimeline({ onSeek }: FeedbackTimelineProps) {
    const currentTime = useFeedbackViewStore((s) => s.currentTime);
    const duration = useFeedbackViewStore((s) => s.duration);
    const feedbacks = useFeedbackViewStore((s) => s.feedbacks);
    const selectedFeedbackId = useFeedbackViewStore((s) => s.selectedFeedbackId);
    const setSelectedFeedbackId = useFeedbackViewStore((s) => s.setSelectedFeedbackId);

    const markers = useMemo(() => {
        return feedbacks
            .filter((f) => f.startTime !== null)
            .map((f) => ({
                id: f.id,
                time: f.startTime!,
                endTime: f.endTime ?? (f.startTime! + 3),
                priority: f.priority,
                hasAnnotation: !!f.annotation,
                content: f.content.slice(0, 40) + (f.content.length > 40 ? "..." : ""),
            }));
    }, [feedbacks]);

    if (duration <= 0) return null;

    const progress = (currentTime / duration) * 100;

    const getPriorityColor = (p: string) => {
        if (p === "URGENT") return "bg-red-500 shadow-red-500/50";
        if (p === "HIGH") return "bg-amber-500 shadow-amber-500/50";
        return "bg-blue-400 shadow-blue-400/50";
    };

    return (
        <div className="relative w-full px-1 py-3 group/timeline">
            {/* Track Background */}
            <div className="relative h-2 bg-white/[0.06] rounded-full overflow-visible cursor-pointer"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const pct = x / rect.width;
                    onSeek(pct * duration);
                }}
            >
                {/* Played Progress */}
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />

                {/* Feedback Markers */}
                {markers.map((m) => {
                    const left = (m.time / duration) * 100;
                    const rangeWidth = Math.max(((m.endTime - m.time) / duration) * 100, 0.5);
                    const isSelected = m.id === selectedFeedbackId;

                    const getPriorityBgColor = (p: string) => {
                        if (p === "URGENT") return "bg-red-500";
                        if (p === "HIGH") return "bg-amber-500";
                        return "bg-blue-400";
                    };

                    return (
                        <div
                            key={m.id}
                            className="absolute top-1/2 -translate-y-1/2 z-20 group/marker"
                            style={{ left: `${left}%` }}
                        >
                            {/* Range Bar */}
                            <div
                                className={cn(
                                    "absolute top-1/2 -translate-y-1/2 h-full rounded-sm transition-opacity",
                                    getPriorityBgColor(m.priority),
                                    isSelected ? "opacity-40" : "opacity-15"
                                )}
                                style={{ width: `${(rangeWidth / left) * 100}%`, minWidth: '4px' }}
                            />
                            {/* Marker Dot */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFeedbackId(m.id);
                                    onSeek(m.time);
                                }}
                                className={cn(
                                    "w-3 h-3 -ml-1.5 rounded-full border-2 border-[#0c0c14] transition-all duration-200 shadow-lg cursor-pointer",
                                    getPriorityColor(m.priority),
                                    isSelected && "scale-150 ring-2 ring-white/30",
                                    m.hasAnnotation && "ring-1 ring-indigo-400/50"
                                )}
                            />

                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover/marker:opacity-100 transition-opacity">
                                <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 shadow-2xl min-w-[160px] max-w-[220px]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[10px] font-mono text-violet-300 tabular-nums">
                                            {formatTime(m.time)}
                                        </span>
                                        {m.hasAnnotation && (
                                            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-bold">🎨</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">{m.content}</p>
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#1a1a2e]" />
                            </div>
                        </div>
                    );
                })}

                {/* Playhead */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 -ml-2 bg-white rounded-full shadow-lg shadow-white/20 border-2 border-indigo-500 z-30 transition-all duration-100"
                    style={{ left: `${progress}%` }}
                />
            </div>

            {/* Time Labels */}
            <div className="flex justify-between mt-1.5 px-0.5">
                <span className="text-[10px] font-mono text-slate-500 tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-[10px] font-mono text-slate-500 tabular-nums">{formatTime(duration)}</span>
            </div>
        </div>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
