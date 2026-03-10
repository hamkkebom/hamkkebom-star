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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-violet-400" />
                        <h2 className="text-lg font-black text-white">인기 영상</h2>
                    </div>
                    <Link href="/videos?sort=popular" className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
                        전체 보기
                    </Link>
                </div>

                <div className="relative rounded-2xl overflow-hidden h-[50vh] min-h-[400px] max-h-[600px] bg-black">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={v.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="absolute inset-0 flex flex-col md:flex-row cursor-grab active:cursor-grabbing"
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = offset.x;
                                if (swipe < -50 || velocity.x < -500) next();
                                else if (swipe > 50 || velocity.x > 500) prev();
                            }}
                        >
                            {/* 데스크톱: 좌측 텍스트 / 모바일: 하단 오버레이 텍스트 */}
                            <div className="absolute inset-x-0 bottom-0 top-1/2 md:inset-y-0 md:relative md:w-[45%] z-20 flex flex-col justify-end md:justify-center p-6 sm:p-10 pointer-events-none">
                                <div className="space-y-4 max-w-xl pointer-events-auto">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[10px] sm:text-xs font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.6)] tracking-wider">
                                        TOP {current + 1}
                                    </span>
                                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white line-clamp-2 md:line-clamp-3 drop-shadow-lg leading-tight">
                                        {v.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-white/80">
                                        <span className="font-semibold text-white truncate max-w-[120px]">{displayName}</span>
                                        <span className="flex items-center gap-1.5 bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                            <Eye className="w-4 h-4" />
                                            {v.viewCount.toLocaleString()}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/videos/${v.id}`}
                                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] active:scale-95 transition-all"
                                        draggable={false}
                                    >
                                        <Play className="w-5 h-5 fill-white" />
                                        재생하기
                                    </Link>
                                </div>
                            </div>

                            {/* 데스크톱: 우측 이미지 / 모바일: 풀 이미지 */}
                            <div className="absolute inset-0 md:relative md:w-[55%] pointer-events-none">
                                {v.signedThumbnailUrl ? (
                                    <img
                                        src={v.signedThumbnailUrl}
                                        alt={v.title}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-violet-900/80 via-indigo-900/60 to-slate-900 flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                                        <Play className="w-20 h-20 text-white/10" />
                                    </div>
                                )}
                                {/* 모바일 하단 그라데이션 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent md:hidden pointer-events-none" />
                                {/* 데스크톱 좌측 그라데이션 (부드러운 블렌딩) */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent hidden md:block pointer-events-none" />
                            </div>
                        </motion.div>
                    </AnimatePresence>

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
