"use client";

import { useQuery } from "@tanstack/react-query";
import { Moon, Lightbulb, AlertTriangle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AiInsight {
    title: string;
    content: string;
    type: "tip" | "warning" | "praise";
}

interface AiAnalysis {
    summary: string;
    insights: AiInsight[];
    status: string;
}

const insightConfig = {
    tip: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "꿀팁" },
    warning: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "주의" },
    praise: { icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "칭찬" },
};

export function AiInsightsPanel({ submissionId }: { submissionId: string }) {
    const { data: analysis } = useQuery<AiAnalysis | null>({
        queryKey: ["ai-analysis", submissionId],
        queryFn: async () => {
            const res = await fetch(`/api/ai/analyze/${submissionId}`, { cache: "no-store" });
            if (!res.ok) return null;
            const json = await res.json();
            return json.data ?? null;
        },
    });

    // 분석 결과가 없거나 완료되지 않았으면 요약만 숨김 처리
    if (!analysis || analysis.status !== "DONE") {
        return (
            <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-5 flex gap-4 items-start relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Moon className="w-5 h-5" />
                </div>
                <div className="space-y-1 relative z-10">
                    <h4 className="font-bold text-sm flex items-center gap-2 tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 font-extrabold">달빛 AI 공략집</span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        우측 &quot;AI 분석 시작&quot; 버튼을 눌러<br />
                        AI가 분석한 영상 공략법을 확인하세요! 🌙
                    </p>
                </div>
            </div>
        );
    }

    const insights = (analysis.insights ?? []) as AiInsight[];

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-5 flex gap-4 items-start relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Moon className="w-5 h-5" />
                </div>
                <div className="space-y-1 relative z-10">
                    <h4 className="font-bold text-sm flex items-center gap-2 tracking-tight">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 font-extrabold">달빛 AI 공략집</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-indigo-500/30 text-indigo-500">AI</Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {analysis.summary}
                    </p>
                </div>
            </div>

            {/* Insights */}
            {insights.length > 0 && (
                <div className="space-y-2">
                    {insights.map((insight, idx) => {
                        const cfg = insightConfig[insight.type] || insightConfig.tip;
                        const Icon = cfg.icon;
                        return (
                            <div key={idx} className={cn("rounded-xl p-3 flex gap-3 items-start border", cfg.bg, cfg.border)}>
                                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.color)} />
                                <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs font-bold", cfg.color)}>{insight.title}</span>
                                        <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1", cfg.border, cfg.color)}>{cfg.label}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.content}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
