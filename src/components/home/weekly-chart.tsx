"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Eye, ArrowUp, ArrowDown, Minus, Sparkles } from "lucide-react";
import Link from "next/link";

type ChartVideo = {
    id: string;
    title: string;
    signedThumbnailUrl: string | null;
    viewCount: number;
    owner: { name: string; chineseName: string | null };
};

export function WeeklyChart() {
    const { data: videos = [] } = useQuery<ChartVideo[]>({
        queryKey: ["weekly-chart"],
        queryFn: async () => {
            const res = await fetch("/api/videos?sort=popular&pageSize=10");
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    if (videos.length === 0) return null;

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-black text-foreground">주간 인기 차트</h2>
                </div>
                <Link href="/videos?sort=popular" className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline">
                    전체 보기
                </Link>
            </div>

            {/* TOP 3 대형 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {videos.slice(0, 3).map((v, i) => {
                    const rankColors = [
                        "from-amber-400 to-orange-500 shadow-amber-500/40",
                        "from-slate-300 to-slate-400 shadow-slate-400/40",
                        "from-amber-600 to-amber-700 shadow-amber-700/40",
                    ];

                    return (
                        <motion.div
                            key={v.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link
                                href={`/videos/${v.id}`}
                                className="group block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-300 dark:hover:border-violet-700 transition-all active:scale-[0.98] bg-white dark:bg-slate-900"
                            >
                                <div className="relative bg-slate-100 dark:bg-slate-800 aspect-video overflow-hidden">
                                    {v.signedThumbnailUrl ? (
                                        <img src={v.signedThumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
                                            <Sparkles className="w-8 h-8 text-amber-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg bg-gradient-to-br ${rankColors[i]} flex items-center justify-center text-white text-sm font-black shadow-lg border border-white/20 z-10`}>
                                        {i + 1}
                                    </div>
                                    {i === 0 && (
                                        <div className="absolute top-3 right-3 px-3 py-1.5 text-[11px] font-black text-amber-950 bg-amber-400 rounded-full flex items-center gap-1 shadow-lg z-10">
                                            <Trophy className="w-3.5 h-3.5" /> 주간 1위
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-bold line-clamp-2 text-foreground mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{v.title}</h3>
                                    <div className="flex items-center justify-between mt-auto text-xs text-muted-foreground">
                                        <span className="font-medium truncate pe-2">{v.owner.chineseName || v.owner.name}</span>
                                        <span className="flex items-center gap-1 shrink-0">
                                            <Eye className="w-3.5 h-3.5" />
                                            {v.viewCount >= 10000 ? (v.viewCount / 10000).toFixed(1) + '만' : v.viewCount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            {/* 4-10위 리스트 */}
            {videos.length > 3 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    {videos.slice(3, 10).map((v, i) => (
                        <Link
                            key={v.id}
                            href={`/videos/${v.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 active:scale-[0.99]"
                        >
                            <span className="w-7 text-center text-sm font-black text-muted-foreground">
                                {i + 4}
                            </span>
                            <div className="w-12 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                {v.signedThumbnailUrl ? (
                                    <img src={v.signedThumbnailUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{v.title}</p>
                                <p className="text-xs text-muted-foreground">{v.owner.chineseName || v.owner.name}</p>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                <Eye className="w-3 h-3" />
                                {v.viewCount.toLocaleString()}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
