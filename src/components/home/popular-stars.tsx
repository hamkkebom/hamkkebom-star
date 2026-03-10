"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, ChevronRight } from "lucide-react";
import Link from "next/link";

type StarItem = {
    id: string;
    name: string;
    chineseName: string | null;
    videoCount: number;
};

export function PopularStars() {
    const { data: stars = [] } = useQuery<StarItem[]>({
        queryKey: ["popular-stars"],
        queryFn: async () => {
            const res = await fetch("/api/videos/owners");
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []).slice(0, 12);
        },
        staleTime: 5 * 60 * 1000,
    });

    if (stars.length === 0) return null;

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <h2 className="text-lg font-black text-foreground">인기 크리에이터</h2>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
                {stars.map((star, i) => (
                    <motion.div
                        key={star.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="snap-start"
                    >
                        <Link
                            href={`/videos?ownerName=${encodeURIComponent(star.chineseName || star.name)}`}
                            className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all active:scale-95 min-w-[110px]"
                        >
                            <div className="relative">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-black shadow-lg ${i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30" :
                                        i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 shadow-slate-500/30" :
                                            i === 2 ? "bg-gradient-to-br from-amber-700 to-orange-800 shadow-orange-900/30" :
                                                "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20"
                                    }`}>
                                    {(star.chineseName || star.name).charAt(0)}
                                </div>
                                {i < 3 && (
                                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-md border border-white/20 ${i === 0 ? "bg-amber-400 text-amber-950" :
                                            i === 1 ? "bg-slate-300 text-slate-900" :
                                                "bg-amber-700"
                                        }`}>
                                        {i + 1}
                                    </div>
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-foreground truncate max-w-[90px]">
                                    {star.chineseName || star.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    영상 {star.videoCount}개
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
