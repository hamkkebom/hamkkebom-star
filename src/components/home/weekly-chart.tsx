"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Eye, Sparkles } from "lucide-react";
import Link from "next/link";

type ChartVideo = {
    id: string;
    title: string;
    signedThumbnailUrl: string | null;
    viewCount: number;
    owner: { name: string; chineseName: string | null };
};

function formatViews(n: number) {
    if (n >= 10000) return (n / 10000).toFixed(1) + "만";
    return n.toLocaleString();
}

const RANK_COLORS = [
    "from-amber-400 to-orange-500",
    "from-slate-300 to-slate-400",
    "from-amber-600 to-amber-700",
];

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

    const top1 = videos[0];
    const top2_3 = videos.slice(1, 3);
    const rest = videos.slice(3, 10);

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

            {/* ===== 모바일 레이아웃 ===== */}
            <div className="sm:hidden space-y-3">
                {/* TOP 1 — 대형 풀 카드 */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <Link href={`/videos/${top1.id}`} className="group block rounded-2xl overflow-hidden border border-border bg-card active:scale-[0.98] transition-transform">
                        <div className="relative aspect-video bg-muted overflow-hidden">
                            {top1.signedThumbnailUrl ? (
                                <img src={top1.signedThumbnailUrl} alt={top1.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/30 to-indigo-900/30">
                                    <Sparkles className="w-10 h-10 text-amber-400" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-lg">
                                <Trophy className="w-3.5 h-3.5" /> 주간 1위
                            </div>
                            <div className="absolute bottom-3 left-3 right-3">
                                <h3 className="text-base font-black text-white line-clamp-2 drop-shadow-md">{top1.title}</h3>
                                <div className="flex items-center justify-between mt-1.5 text-xs text-white/80">
                                    <span className="font-semibold">{top1.owner.chineseName || top1.owner.name}</span>
                                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatViews(top1.viewCount)}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </motion.div>

                {/* TOP 2-3 — 가로 2열 */}
                <div className="grid grid-cols-2 gap-3">
                    {top2_3.map((v, i) => (
                        <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * (i + 1) }}>
                            <Link href={`/videos/${v.id}`} className="group block rounded-xl overflow-hidden border border-border bg-card active:scale-[0.97] transition-transform">
                                <div className="relative aspect-video bg-muted overflow-hidden">
                                    {v.signedThumbnailUrl ? (
                                        <img src={v.signedThumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/30 to-indigo-900/30">
                                            <Sparkles className="w-6 h-6 text-amber-400" />
                                        </div>
                                    )}
                                    <div className={`absolute top-2 left-2 w-7 h-7 rounded-lg bg-gradient-to-br ${RANK_COLORS[i + 1]} flex items-center justify-center text-white text-xs font-black shadow-md border border-white/20`}>
                                        {i + 2}
                                    </div>
                                </div>
                                <div className="p-2.5">
                                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{v.title}</h3>
                                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                                        <span className="truncate pr-1">{v.owner.chineseName || v.owner.name}</span>
                                        <span className="flex items-center gap-0.5 shrink-0"><Eye className="w-3 h-3" />{formatViews(v.viewCount)}</span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* 4-10위 리스트 */}
                {rest.length > 0 && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        {rest.map((v, i) => (
                            <Link
                                key={v.id}
                                href={`/videos/${v.id}`}
                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors border-b border-border last:border-0 active:bg-accent"
                            >
                                <span className="w-6 text-center text-xs font-black text-muted-foreground">{i + 4}</span>
                                <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                                    {v.signedThumbnailUrl ? (
                                        <img src={v.signedThumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-indigo-900/30" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{v.title}</p>
                                    <p className="text-[10px] text-muted-foreground">{v.owner.chineseName || v.owner.name}</p>
                                </div>
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                    <Eye className="w-3 h-3" />{formatViews(v.viewCount)}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* ===== 데스크탑 레이아웃 (기존 유지) ===== */}
            <div className="hidden sm:block">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {videos.slice(0, 3).map((v, i) => (
                        <motion.div
                            key={v.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Link
                                href={`/videos/${v.id}`}
                                className="group block rounded-2xl overflow-hidden border border-border bg-card hover:shadow-lg hover:shadow-violet-500/10 hover:border-violet-500/40 transition-all active:scale-[0.98]"
                            >
                                <div className="relative bg-muted aspect-video overflow-hidden">
                                    {v.signedThumbnailUrl ? (
                                        <img src={v.signedThumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/30 to-indigo-900/30">
                                            <Sparkles className="w-8 h-8 text-amber-400" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                    <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center text-white text-sm font-black shadow-lg border border-white/20 z-10`}>
                                        {i + 1}
                                    </div>
                                    {i === 0 && (
                                        <div className="absolute top-3 right-3 px-3 py-1.5 text-[11px] font-black text-amber-950 bg-amber-400 rounded-full flex items-center gap-1 shadow-lg z-10">
                                            <Trophy className="w-3.5 h-3.5" /> 주간 1위
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-bold line-clamp-2 text-foreground mb-2 group-hover:text-violet-600 transition-colors">{v.title}</h3>
                                    <div className="flex items-center justify-between mt-auto text-xs text-muted-foreground">
                                        <span className="font-medium truncate pe-2">{v.owner.chineseName || v.owner.name}</span>
                                        <span className="flex items-center gap-1 shrink-0">
                                            <Eye className="w-3.5 h-3.5" />
                                            {formatViews(v.viewCount)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* 4-10위 리스트 (데스크탑) */}
                {rest.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        {rest.map((v, i) => (
                            <Link
                                key={v.id}
                                href={`/videos/${v.id}`}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0 active:scale-[0.99]"
                            >
                                <span className="w-7 text-center text-sm font-black text-muted-foreground">{i + 4}</span>
                                <div className="w-12 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                                    {v.signedThumbnailUrl ? (
                                        <img src={v.signedThumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-indigo-900/30" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{v.title}</p>
                                    <p className="text-xs text-muted-foreground">{v.owner.chineseName || v.owner.name}</p>
                                </div>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                    <Eye className="w-3 h-3" />{formatViews(v.viewCount)}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
