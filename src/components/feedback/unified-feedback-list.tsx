"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    MessageSquare,
    Image as ImageIcon,
    Search,
    AlertCircle,
    Loader2,
    Filter,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

// --- Types ---

interface AiTodoItem {
    text: string;
    category: "audio" | "visual" | "editing" | "storytelling";
    priority: "high" | "medium" | "low";
    ai: boolean;
}

interface FeedbackItem {
    id: string;
    type: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    content: string;
    startTime: number | null;
    endTime: number | null;
    status: string;
    createdAt: string;
    author: {
        name: string;
        avatarUrl: string | null;
    };
}

interface UnifiedItem {
    id: string;
    originalId: string;
    source: "AI" | "HUMAN";
    content: string;
    category: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    hasImage: boolean;
    isCompleted: boolean;
    authorName?: string;
    timestamp?: string;
}

// --- Korean Mappings & Styles ---

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
    // AI Categories
    audio: { label: "🎧 오디오", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    visual: { label: "🎨 비주얼", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    editing: { label: "✂️ 편집", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    storytelling: { label: "📖 스토리", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },

    // Human Categories
    GENERAL: { label: "💬 일반", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    SUBTITLE: { label: "📝 자막", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
    BGM: { label: "🎵 BGM", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
    CUT_EDIT: { label: "🎬 컷편집", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
    COLOR_GRADE: { label: "🌈 색보정", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
};

const normalizePriority = (p: string): "HIGH" | "MEDIUM" | "LOW" => {
    const map: Record<string, "HIGH" | "MEDIUM" | "LOW"> = {
        high: "HIGH", HIGH: "HIGH", URGENT: "HIGH",
        medium: "MEDIUM", NORMAL: "MEDIUM",
        low: "LOW", LOW: "LOW"
    };
    return map[p] || "MEDIUM";
};

// --- Fetchers ---

async function fetchAiAnalysis(submissionId: string) {
    const res = await fetch(`/api/ai/analyze/${submissionId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("AI data fetch failed");
    return res.json();
}

async function fetchFeedbacks(submissionId: string) {
    const res = await fetch(`/api/feedbacks?submissionId=${submissionId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Feedback fetch failed");
    return res.json();
}

// --- Component ---

export function UnifiedFeedbackList({ submissionId }: { submissionId: string }) {
    const [filterSource, setFilterSource] = useState<"ALL" | "AI" | "HUMAN">("ALL");
    const [filterImage, setFilterImage] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

    // Queries
    const aiQuery = useQuery({
        queryKey: ["ai-analysis", submissionId],
        queryFn: () => fetchAiAnalysis(submissionId),
        refetchInterval: (query) => query.state.data?.data?.status === "PROCESSING" ? 3000 : false,
    });

    const feedbackQuery = useQuery({
        queryKey: ["feedbacks", submissionId],
        queryFn: () => fetchFeedbacks(submissionId),
    });

    // Combine Data
    const items: UnifiedItem[] = useMemo(() => {
        const combined: UnifiedItem[] = [];

        // AI Items
        if (aiQuery.data?.data?.todoItems) {
            aiQuery.data.data.todoItems.forEach((item: AiTodoItem, idx: number) => {
                combined.push({
                    id: `ai-${idx}`,
                    originalId: String(idx),
                    source: "AI",
                    content: item.text,
                    category: item.category,
                    priority: normalizePriority(item.priority),
                    hasImage: false,
                    isCompleted: false,
                    authorName: "달토끼 AI"
                });
            });
        }

        // Feedback Items
        if (feedbackQuery.data?.data) {
            feedbackQuery.data.data.forEach((item: FeedbackItem) => {
                combined.push({
                    id: `fb-${item.id}`,
                    originalId: item.id,
                    source: "HUMAN",
                    content: item.content,
                    category: item.type,
                    priority: normalizePriority(item.priority),
                    hasImage: false, // Future implementation
                    isCompleted: false,
                    authorName: item.author.name,
                    timestamp: item.startTime ? `${Math.floor(item.startTime / 60)}:${String(Math.floor(item.startTime % 60)).padStart(2, '0')}` : undefined
                });
            });
        }

        return combined;
    }, [aiQuery.data, feedbackQuery.data]);

    // Filter Logic
    const filteredItems = items.filter(item => {
        if (filterSource !== "ALL" && item.source !== filterSource) return false;
        if (filterImage && !item.hasImage) return false;
        if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleCheck = (id: string) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                confetti({
                    particleCount: 80, spread: 70, origin: { y: 0.7 },
                    colors: ['#a786ff', '#fd8bbc', '#ffffff']
                });
            }
            return next;
        });
    };

    const completedCount = checkedIds.size;
    const isLoading = aiQuery.isLoading || feedbackQuery.isLoading;

    return (
        <div className="flex flex-col h-[650px] w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/5 transition-all hover:ring-white/10">

            {/* --- Header Area --- */}
            <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/5 via-transparent to-transparent space-y-5">

                {/* Title & Stats */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-extrabold flex items-center gap-2 text-white tracking-tight">
                            <Sparkles className="w-5 h-5 text-fuchsia-500 fill-fuchsia-500/20 animate-pulse" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-fuchsia-200">
                                액션 센터
                            </span>
                        </h2>
                        <p className="text-[11px] text-muted-foreground font-medium pl-0.5">
                            AI 분석과 피드백을 한번에 관리하세요
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="bg-white/5 border-white/10 text-[10px] font-mono hover:bg-white/10 transition-colors">
                            {completedCount} / {items.length} 완료
                        </Badge>
                        {items.length > 0 && (
                            <div className="h-1 w-20 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(completedCount / items.length) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Search & Image Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-violet-400 transition-colors" />
                        <Input
                            placeholder="내용 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-black/20 border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20 text-sm rounded-xl transition-all"
                        />
                    </div>
                    <Button
                        variant={filterImage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterImage(!filterImage)}
                        className={cn(
                            "h-9 px-3 gap-2 border-white/10 rounded-xl transition-all duration-300",
                            filterImage
                                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                : "bg-transparent hover:bg-white/5 text-muted-foreground hover:text-white"
                        )}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span className="hidden sm:inline text-xs font-medium">이미지 포함</span>
                    </Button>
                </div>

                {/* Tab Filters */}
                <div className="bg-black/20 p-1 rounded-xl border border-white/5">
                    <Tabs value={filterSource} onValueChange={(v) => setFilterSource(v as "ALL" | "AI" | "HUMAN")} className="w-full">
                        <TabsList className="w-full grid grid-cols-3 h-8 bg-transparent p-0 gap-1">
                            <TabsTrigger
                                value="ALL"
                                className="h-full rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white text-muted-foreground transition-all"
                            >
                                전체 보기
                            </TabsTrigger>
                            <TabsTrigger
                                value="AI"
                                className="h-full rounded-lg text-xs font-medium data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-muted-foreground transition-all gap-1.5"
                            >
                                <Sparkles className="w-3 h-3" /> AI 퀘스트
                            </TabsTrigger>
                            <TabsTrigger
                                value="HUMAN"
                                className="h-full rounded-lg text-xs font-medium data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 text-muted-foreground transition-all gap-1.5"
                            >
                                <MessageSquare className="w-3 h-3" /> 사용자 댓글
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* --- List Area --- */}
            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-60 space-y-4 opacity-70">
                        <div className="relative">
                            <div className="absolute inset-0 bg-violet-500 blur-xl opacity-20 animate-pulse" />
                            <Loader2 className="relative w-10 h-10 animate-spin text-fuchsia-400" />
                        </div>
                        <p className="text-xs text-muted-foreground font-medium animate-pulse">데이터를 불러오고 있습니다...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 text-muted-foreground space-y-3">
                        <div className="p-4 rounded-full bg-white/5 ring-1 ring-white/10">
                            <Filter className="w-6 h-6 opacity-30" />
                        </div>
                        <p className="text-sm font-medium">조건에 맞는 피드백이 없어요!</p>
                    </div>
                ) : (
                    <div className="space-y-2.5 pb-20">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map((item, index) => {
                                const isAi = item.source === "AI";
                                const catStyle = CATEGORY_MAP[item.category] || { label: item.category, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };

                                return (
                                    <motion.div
                                        key={item.id}
                                        layout // Enable automatic layout animations
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.3, delay: index * 0.03 }}
                                        onClick={() => handleCheck(item.id)}
                                        className={cn(
                                            "group relative p-3.5 rounded-2xl border transition-all cursor-pointer overflow-hidden backdrop-blur-sm",
                                            checkedIds.has(item.id)
                                                ? "bg-black/20 border-white/5 opacity-50 grayscale-[0.5]"
                                                : "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-violet-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5"
                                        )}
                                    >
                                        {/* Active Indicator Glow */}
                                        {!checkedIds.has(item.id) && (
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-[3px] transition-all",
                                                isAi ? "bg-gradient-to-b from-violet-500 to-fuchsia-500 opacity-60 group-hover:opacity-100" : "bg-blue-500 opacity-60 group-hover:opacity-100"
                                            )} />
                                        )}

                                        <div className="flex items-start gap-3.5 pl-1.5">
                                            {/* Checkbox */}
                                            <div className={cn(
                                                "mt-0.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 shadow-inner",
                                                checkedIds.has(item.id)
                                                    ? "bg-emerald-500 border-emerald-500 text-white scale-110 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                                                    : "border-white/20 bg-black/20 group-hover:border-violet-400/50"
                                            )}>
                                                <AnimatePresence>
                                                    {checkedIds.has(item.id) && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            exit={{ scale: 0 }}
                                                        >
                                                            <Check className="w-3 h-3 stroke-[3px]" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn("text-[10px] px-2 py-0.5 h-5 font-bold border rounded-md shadow-sm", catStyle.color)}
                                                    >
                                                        {catStyle.label}
                                                    </Badge>

                                                    {item.timestamp && (
                                                        <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-violet-200/70 font-mono flex items-center gap-1 border border-white/5">
                                                            ⏱ {item.timestamp}
                                                        </span>
                                                    )}

                                                    {item.priority === "HIGH" && (
                                                        <span className="ml-auto flex items-center gap-1 bg-rose-500/10 text-rose-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                                                            <AlertCircle className="w-2.5 h-2.5" /> 긴급
                                                        </span>
                                                    )}
                                                </div>

                                                <p className={cn(
                                                    "text-sm leading-relaxed text-slate-200 transition-all font-medium",
                                                    checkedIds.has(item.id) && "line-through text-muted-foreground decoration-slate-500/50"
                                                )}>
                                                    {item.content}
                                                </p>

                                                <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-1">
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        {isAi ? (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold">
                                                                <Sparkles className="w-3 h-3" /> 달토끼 AI
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">
                                                                <MessageSquare className="w-3 h-3" /> {item.authorName}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
