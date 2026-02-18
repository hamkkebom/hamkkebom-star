"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Sparkles, Zap, Moon, Loader2, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// --- Types ---

interface AiTodoItem {
    text: string;
    category: "audio" | "visual" | "editing" | "storytelling";
    priority: "high" | "medium" | "low";
    ai: boolean;
}

interface AiScores {
    overall: number;
    audio: number;
    visual: number;
    editing: number;
    storytelling: number;
}

interface AiInsight {
    title: string;
    content: string;
    type: "tip" | "warning" | "praise";
}

interface AiAnalysis {
    id: string;
    submissionId: string;
    summary: string;
    scores: AiScores;
    todoItems: AiTodoItem[];
    insights: AiInsight[];
    status: string;
    model: string;
    errorMessage: string | null;
}

// --- Fetch / Trigger ---

async function fetchAiAnalysis(submissionId: string): Promise<AiAnalysis | null> {
    const res = await fetch(`/api/ai/analyze/${submissionId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("AI 분석 데이터를 불러오지 못했습니다.");
    const json = await res.json();
    return json.data ?? null;
}

async function triggerAiAnalysis(submissionId: string, force = false): Promise<AiAnalysis> {
    const res = await fetch(`/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, force }),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "AI 분석 요청 실패");
    }
    const json = await res.json();
    return json.data;
}

// --- Category Labels ---

const categoryLabels: Record<string, string> = {
    audio: "🎧 오디오",
    visual: "🎨 비주얼",
    editing: "✂️ 편집",
    storytelling: "📖 스토리",
};

const priorityColors: Record<string, string> = {
    high: "text-rose-400",
    medium: "text-amber-400",
    low: "text-emerald-400",
};

// --- Score Bar ---

function ScoreBar({ label, score, emoji }: { label: string; score: number; emoji: string }) {
    const color = score >= 80 ? "from-emerald-500 to-teal-500" : score >= 60 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-pink-500";
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground font-medium">{emoji} {label}</span>
                <span className="font-bold tabular-nums">{score}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out", color)}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

// --- Main Component ---

export function AiTodoList({ submissionId }: { submissionId: string }) {
    const queryClient = useQueryClient();
    const [checked, setChecked] = useState<Set<number>>(new Set());

    const { data: analysis, isLoading } = useQuery({
        queryKey: ["ai-analysis", submissionId],
        queryFn: () => fetchAiAnalysis(submissionId),
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "PROCESSING") return 3000;
            return false;
        },
    });

    const mutation = useMutation({
        mutationFn: ({ force = false }: { force?: boolean } = {}) => triggerAiAnalysis(submissionId, force),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-analysis", submissionId] });
        },
    });

    const handleCheck = (idx: number) => {
        setChecked(prev => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
                confetti({
                    particleCount: 80,
                    spread: 60,
                    origin: { y: 0.6 },
                    colors: ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'],
                });
            }
            return next;
        });
    };

    const todos = (analysis?.todoItems ?? []) as AiTodoItem[];
    const scores = analysis?.scores as AiScores | undefined;
    const completedCount = checked.size;
    const totalCount = todos.length || 1;
    const progress = Math.round((completedCount / totalCount) * 100);

    // --- Not yet analyzed ---
    if (!analysis || analysis.status === "PENDING" || analysis.status === "ERROR") {
        return (
            <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-5 space-y-4 shadow-inner">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 font-extrabold text-sm">달토끼 AI 퀘스트</span>
                </div>

                {analysis?.status === "ERROR" && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 rounded-lg p-2 border border-rose-500/20">
                        ⚠️ {analysis.errorMessage || "분석 중 오류가 발생했습니다."}
                    </div>
                )}

                <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                        <Moon className="w-7 h-7 text-violet-400" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        AI가 영상을 분석하여<br />맞춤형 개선 퀘스트를 생성합니다.
                    </p>
                    <Button
                        size="sm"
                        onClick={() => mutation.mutate({ force: false })}
                        disabled={mutation.isPending}
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg"
                    >
                        {mutation.isPending ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> 분석 요청 중...</>
                        ) : analysis?.status === "ERROR" ? (
                            <><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 재분석 시작</>
                        ) : (
                            <><Play className="w-3.5 h-3.5 mr-1.5" /> AI 분석 시작</>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    // --- Processing ---
    if (analysis.status === "PROCESSING") {
        return (
            <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-5 space-y-4 shadow-inner">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 font-extrabold text-sm">달토끼 AI 퀘스트</span>
                </div>
                <div className="text-center py-6 space-y-3">
                    <Loader2 className="w-8 h-8 mx-auto text-violet-400 animate-spin" />
                    <p className="text-xs text-muted-foreground animate-pulse">
                        🌙 달토끼가 영상을 분석하고 있어요...<br />
                        잠시만 기다려 주세요!
                    </p>
                </div>
            </div>
        );
    }

    // --- Done ---
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 space-y-4 shadow-inner">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500 font-extrabold">달토끼 AI 퀘스트</span>
                </h3>
                <Badge variant="secondary" className="text-[10px] font-mono h-5 bg-white/10 text-white hover:bg-white/20">
                    {completedCount}/{todos.length}
                </Badge>
            </div>

            {/* Progress */}
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Scores */}
            {scores && (
                <div className="space-y-2 p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI 점수</span>
                        <span className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">{scores.overall}</span>
                    </div>
                    <ScoreBar label="오디오" score={scores.audio} emoji="🎧" />
                    <ScoreBar label="비주얼" score={scores.visual} emoji="🎨" />
                    <ScoreBar label="편집" score={scores.editing} emoji="✂️" />
                    <ScoreBar label="스토리" score={scores.storytelling} emoji="📖" />
                </div>
            )}

            {/* Todo Items */}
            <div className="space-y-2">
                {todos.map((todo, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleCheck(idx)}
                        className={cn(
                            "group flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border border-transparent hover:bg-white/5",
                            checked.has(idx) ? "opacity-50" : "hover:border-white/10"
                        )}
                    >
                        <div className={cn(
                            "mt-0.5 w-4 h-4 flex items-center justify-center rounded-full border transition-colors",
                            checked.has(idx)
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-white/30 group-hover:border-emerald-400"
                        )}>
                            {checked.has(idx) && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className={cn(
                                "text-xs font-medium leading-tight transition-all",
                                checked.has(idx) && "line-through text-muted-foreground"
                            )}>
                                {todo.text}
                            </p>
                            <div className="flex items-center gap-2">
                                {todo.ai && (
                                    <span className="inline-flex items-center gap-1 text-[9px] text-fuchsia-400 font-bold uppercase tracking-wider">
                                        <Moon className="w-2.5 h-2.5" /> AI 퀘스트
                                    </span>
                                )}
                                <span className={cn("text-[9px] font-medium", priorityColors[todo.priority])}>
                                    {categoryLabels[todo.category]}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Model Info + 재분석 */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[9px] text-muted-foreground/50">
                    Powered by {analysis.model === "mock" ? "Mock AI" : "Gemini 2.0 Flash"}
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => mutation.mutate({ force: true })}
                    disabled={mutation.isPending}
                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                >
                    {mutation.isPending ? (
                        <><Loader2 className="w-3 h-3 animate-spin mr-1" /> 재분석 중...</>
                    ) : (
                        <><RotateCcw className="w-3 h-3 mr-1" /> 재분석</>
                    )}
                </Button>
            </div>
        </div>
    );
}
