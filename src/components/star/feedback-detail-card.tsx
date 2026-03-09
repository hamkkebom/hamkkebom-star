"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useFeedbackViewStore } from "@/store/feedback-view-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Brush, User, MessageCircle, Send, ChevronDown } from "lucide-react";
import confetti from "canvas-confetti";
import { formatDistanceToNow, isToday, format } from "date-fns";
import { ko } from "date-fns/locale";
import { DrawingPreview } from "@/components/admin/drawing-preview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface FeedbackDetailCardProps {
    onTimecodeClick: (time: number) => void;
}

interface Reply {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string; role: string; avatarUrl: string | null };
}

const typeLabels: Record<string, string> = {
    GENERAL: "💬 일반",
    SUBTITLE: "📝 자막",
    BGM: "🎵 BGM",
    CUT_EDIT: "🎬 컷편집",
    COLOR_GRADE: "🌈 색보정",
};

const priorityConfig: Record<string, { label: string; color: string }> = {
    URGENT: { label: "🔴 긴급", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    HIGH: { label: "🟡 높음", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    NORMAL: { label: "🔵 보통", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    LOW: { label: "⚪ 낮음", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

function formatFeedbackTime(dateStr: string): string {
    const date = new Date(dateStr);
    if (isToday(date)) {
        return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    }
    return format(date, "M월 d일 HH:mm", { locale: ko });
}

function formatTimecode(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// --- Reply Section Component ---
function ReplySection({ feedbackId }: { feedbackId: string }) {
    const [replyText, setReplyText] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: replies = [] } = useQuery<Reply[]>({
        queryKey: ["feedback-replies", feedbackId],
        queryFn: async () => {
            const res = await fetch(`/api/feedbacks/${feedbackId}/replies`, { cache: "no-store" });
            if (!res.ok) return [];
            const json = await res.json();
            return json.data ?? [];
        },
        enabled: isOpen,
        staleTime: 30_000,
    });

    const sendReply = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/feedbacks/${feedbackId}/replies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("전송 실패");
            return res.json();
        },
        onSuccess: () => {
            setReplyText("");
            queryClient.invalidateQueries({ queryKey: ["feedback-replies", feedbackId] });
        },
    });

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!replyText.trim()) return;
        sendReply.mutate(replyText.trim());
    }, [replyText, sendReply]);

    return (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
            >
                <MessageCircle className="w-3 h-3" />
                <span className="font-medium">답변</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {/* Replies List */}
                        {replies.length > 0 && (
                            <div className="mt-2 space-y-2 pl-2 border-l-2 border-indigo-500/20">
                                {replies.map((reply) => (
                                    <div key={reply.id} className="text-xs">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className={cn(
                                                "font-bold",
                                                reply.author.role === "ADMIN" ? "text-indigo-300" : "text-emerald-300"
                                            )}>
                                                {reply.author.name}
                                            </span>
                                            <span className="text-slate-600">·</span>
                                            <span className="text-slate-500 text-[10px]">
                                                {formatFeedbackTime(reply.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed">{reply.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Reply Input */}
                        <form onSubmit={handleSubmit} className="mt-2 flex gap-1.5">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="답변을 입력하세요..."
                                className="flex-1 h-8 px-3 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/40"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!replyText.trim() || sendReply.isPending}
                                className="h-8 w-8 p-0 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30"
                            >
                                <Send className="w-3 h-3" />
                            </Button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Main Component ---
export function FeedbackDetailCards({ onTimecodeClick }: FeedbackDetailCardProps) {
    const feedbacks = useFeedbackViewStore((s) => s.feedbacks);
    const selectedFeedbackId = useFeedbackViewStore((s) => s.selectedFeedbackId);
    const setSelectedFeedbackId = useFeedbackViewStore((s) => s.setSelectedFeedbackId);
    const checkedIds = useFeedbackViewStore((s) => s.checkedIds);
    const toggleCheck = useFeedbackViewStore((s) => s.toggleCheck);

    // 타임코드 있는 것 우선, 그 안에서는 시간 순 정렬
    const sorted = [...feedbacks].sort((a, b) => {
        if (a.startTime === null && b.startTime === null) return 0;
        if (a.startTime === null) return 1;
        if (b.startTime === null) return -1;
        return a.startTime - b.startTime;
    });

    const completedCount = checkedIds.size;
    const totalCount = feedbacks.length;

    // 서버에 resolvedByStar 저장 + 클라이언트 체크 토글 + confetti
    const handleCheck = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const wasChecked = checkedIds.has(id);
        toggleCheck(id);

        // 서버에 resolvedByStar 상태 저장
        try {
            await fetch(`/api/feedbacks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolvedByStar: !wasChecked }),
            });
        } catch {
            // 서버 오류 시 토글 복원
            toggleCheck(id);
            return;
        }

        if (!wasChecked) {
            confetti({
                particleCount: 60,
                spread: 55,
                origin: { y: 0.75 },
                colors: ["#a786ff", "#fd8bbc", "#ffffff"],
                disableForReducedMotion: true,
            });

            if (completedCount + 1 === totalCount) {
                setTimeout(() => {
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.6 },
                        colors: ["#00ff9f", "#a786ff", "#ffd700"],
                        gravity: 0.6,
                    });
                }, 300);
            }
        }
    }, [checkedIds, toggleCheck, completedCount, totalCount]);

    return (
        <div className="space-y-4">
            {/* Header + Progress */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    💬 <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">피드백 상세</span>
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">
                        {completedCount}/{totalCount} 완료
                    </span>
                    <div className="h-1.5 w-20 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                            animate={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>

            {/* Cards List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {sorted.map((fb, index) => {
                        const isSelected = fb.id === selectedFeedbackId;
                        const isChecked = checkedIds.has(fb.id);
                        const pConfig = priorityConfig[fb.priority] ?? priorityConfig.NORMAL;
                        const typeLabel = typeLabels[fb.type] ?? fb.type;

                        return (
                            <motion.div
                                key={fb.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.03 }}
                                onClick={() => {
                                    setSelectedFeedbackId(fb.id);
                                    if (fb.startTime !== null) onTimecodeClick(fb.startTime);
                                }}
                                className={cn(
                                    "relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden group/card",
                                    isSelected
                                        ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10",
                                    isChecked && "opacity-50 grayscale-[0.4]"
                                )}
                            >
                                {/* Left accent */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all",
                                    isSelected ? "bg-indigo-500" :
                                        fb.priority === "URGENT" || fb.priority === "HIGH" ? "bg-red-500/60" : "bg-white/10"
                                )} />

                                <div className="flex gap-3 pl-2">
                                    {/* Check Button */}
                                    <button
                                        onClick={(e) => handleCheck(fb.id, e)}
                                        className={cn(
                                            "mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0",
                                            isChecked
                                                ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                                : "border-white/20 hover:border-indigo-400/50 bg-black/20"
                                        )}
                                    >
                                        <AnimatePresence>
                                            {isChecked && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 space-y-2 min-w-0">
                                        {/* Badges Row */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-2 py-0 h-5 font-bold border bg-white/5 text-slate-300 border-white/10"
                                            >
                                                {typeLabel}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[10px] px-2 py-0 h-5 font-bold border", pConfig.color)}
                                            >
                                                {pConfig.label}
                                            </Badge>
                                            {fb.startTime !== null && (
                                                <span className="text-[10px] bg-violet-500/10 text-violet-300 px-1.5 py-0.5 rounded-md font-mono tabular-nums font-bold border border-violet-500/20">
                                                    ⏱ {formatTimecode(fb.startTime)}
                                                    {fb.endTime !== null && ` → ${formatTimecode(fb.endTime)}`}
                                                </span>
                                            )}
                                            {!!fb.annotation && (
                                                <span className="flex items-center gap-0.5 text-[10px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded-md font-bold border border-indigo-500/20">
                                                    <Brush className="w-2.5 h-2.5" /> 드로잉
                                                </span>
                                            )}
                                        </div>

                                        {/* Drawing Preview */}
                                        {!!fb.annotation && (
                                            <div
                                                className="relative w-full h-24 bg-black/30 rounded-xl overflow-hidden border border-indigo-500/10 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFeedbackId(fb.id);
                                                    if (fb.startTime !== null) onTimecodeClick(fb.startTime);
                                                }}
                                            >
                                                <DrawingPreview strokes={fb.annotation} />
                                                <div className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-indigo-300 px-1.5 py-0.5 rounded-md font-bold backdrop-blur-sm">
                                                    🎨 클릭하여 영상에서 보기
                                                </div>
                                            </div>
                                        )}
                                        {/* Text Content */}
                                        <p className={cn(
                                            "text-sm leading-relaxed text-slate-200 font-medium",
                                            isChecked && "line-through text-slate-500"
                                        )}>
                                            {fb.content}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <User className="w-3 h-3" />
                                                <span className="font-medium">{fb.author.name}</span>
                                                <span>·</span>
                                                <span>{formatFeedbackTime(fb.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Reply Section */}
                                        <ReplySection feedbackId={fb.id} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
