"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Play, Eye, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";

type HeroVideo = {
    id: string;
    title: string;
    signedThumbnailUrl: string | null;
    viewCount: number;
    owner: { name: string; chineseName: string | null };
};

export function HeroBanner() {
    const [current, setCurrent] = useState(0);

    const { data: videos = [] } = useQuery<HeroVideo[]>({
        queryKey: ["hero-videos"],
        queryFn: async () => {
            const res = await fetch("/api/videos?sort=popular&pageSize=5");
            if (!res.ok) return [];
            const json = await res.json();
            return json.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (videos.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent((p) => (p + 1) % videos.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [videos.length]);

    const prev = useCallback(() => setCurrent((p) => (p - 1 + videos.length) % videos.length), [videos.length]);
    const next = useCallback(() => setCurrent((p) => (p + 1) % videos.length), [videos.length]);

    if (videos.length === 0) return null;

    const v = videos[current];
    const displayName = v.owner.chineseName || v.owner.name;

    return (
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-black text-white">인기 영상</h2>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-video max-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={v.id}
                            initial={{ opacity: 0, scale: 1.05 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.4 }}
                            className="absolute inset-0"
                        >
                            {v.signedThumbnailUrl ? (
                                <img
                                    src={v.signedThumbnailUrl}
                                    alt={v.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-violet-900 to-indigo-900 flex items-center justify-center">
                                    <Play className="w-16 h-16 text-white/30" />
                                </div>
                            )}
                            {/* 그라데이션 오버레이 */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        </motion.div>
                    </AnimatePresence>

                    {/* 텍스트 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-600/80 px-2.5 py-1 text-[10px] font-bold text-white mb-2 backdrop-blur-sm">
                            TOP {current + 1}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white line-clamp-2 mb-1">
                            {v.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-white/70">
                            <span className="font-medium">{displayName}</span>
                            <span className="flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" />
                                {v.viewCount.toLocaleString()}
                            </span>
                        </div>
                        <Link
                            href={`/videos/${v.id}`}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-5 py-2.5 text-sm font-bold text-white hover:bg-white/30 active:scale-95 transition-all"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            시청하기
                        </Link>
                    </div>

                    {/* 좌우 버튼 */}
                    {videos.length > 1 && (
                        <>
                            <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 backdrop-blur-sm hidden sm:block">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 backdrop-blur-sm hidden sm:block">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* 인디케이터 */}
                    {videos.length > 1 && (
                        <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
                            {videos.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrent(i)}
                                    className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
