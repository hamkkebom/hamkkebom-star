"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
    Search, Video, MessageSquare, Star, Eye, Heart, TrendingUp,
    Sparkles, ChevronRight, Compass, Film, Users, HelpCircle
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

const BOARD_LABELS: Record<string, string> = {
    FREE: "자유", QNA: "Q&A", TIPS: "제작 팁",
    SHOWCASE: "작품 자랑", RECRUITMENT: "협업 모집", NOTICE: "공지",
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    return `${Math.floor(hr / 24)}일 전`;
}

export default function ExplorePage() {
    const [query, setQuery] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: results, isLoading } = useQuery({
        queryKey: ["search", searchQuery],
        queryFn: async () => {
            if (!searchQuery) return null;
            const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: searchQuery.length > 0,
    });

    const { data: trendingVideos = [] } = useQuery({
        queryKey: ["trending-videos"],
        queryFn: async () => {
            const res = await fetch("/api/videos?sort=popular&pageSize=6");
            if (!res.ok) return [];
            return (await res.json()).data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await fetch("/api/categories");
            if (!res.ok) return [];
            return (await res.json()).data || [];
        },
        staleTime: 10 * 60 * 1000,
    });

    const hasResults = results && (results.videos?.length > 0 || results.posts?.length > 0 || results.stars?.length > 0);

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
            <PublicHeader />
            <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-20 md:pb-6 sm:px-6">
                {/* 검색 헤더 */}
                <div className="flex items-center gap-3 mb-8">
                    <Compass className="w-7 h-7 text-violet-500" />
                    <h1 className="text-2xl font-black text-foreground">탐색</h1>
                </div>

                {/* 검색바 */}
                <form
                    onSubmit={(e) => { e.preventDefault(); setSearchQuery(query); }}
                    className="relative mb-8"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="영상, 게시글, 크리에이터 검색..."
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-12 pr-4 py-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-sm"
                    />
                </form>

                {/* 검색 결과 */}
                {searchQuery && (
                    <div className="mb-8">
                        {isLoading ? (
                            <div className="text-center py-10 text-muted-foreground">검색 중...</div>
                        ) : !hasResults ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="font-bold">"{searchQuery}"에 대한 결과가 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* 스타 결과 */}
                                {results.stars?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-3">
                                            <Star className="w-4 h-4 text-amber-500" /> 크리에이터
                                        </h3>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {results.stars.map((star: any) => (
                                                <Link
                                                    key={star.id}
                                                    href={`/videos?ownerName=${encodeURIComponent(star.chineseName || star.name)}`}
                                                    className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-[100px] hover:shadow-md transition-all active:scale-95"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                                                        {(star.chineseName || star.name).charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-foreground">{star.chineseName || star.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">영상 {star._count?.videos || 0}개</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 영상 결과 */}
                                {results.videos?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-3">
                                            <Video className="w-4 h-4 text-violet-500" /> 영상
                                        </h3>
                                        <div className="space-y-2">
                                            {results.videos.map((v: any) => (
                                                <Link
                                                    key={v.id}
                                                    href={`/videos/${v.id}`}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all"
                                                >
                                                    <Film className="w-4 h-4 text-violet-400 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-foreground truncate">{v.title}</p>
                                                        <p className="text-xs text-muted-foreground">{v.owner.chineseName || v.owner.name}</p>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Eye className="w-3 h-3" />{v.viewCount}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 게시글 결과 */}
                                {results.posts?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-black text-foreground flex items-center gap-2 mb-3">
                                            <MessageSquare className="w-4 h-4 text-emerald-500" /> 게시글
                                        </h3>
                                        <div className="space-y-2">
                                            {results.posts.map((p: any) => (
                                                <Link
                                                    key={p.id}
                                                    href={`/community/${p.id}`}
                                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all"
                                                >
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
                                                        {BOARD_LABELS[p.boardType] || p.boardType}
                                                    </span>
                                                    <p className="flex-1 text-sm font-bold text-foreground truncate">{p.title}</p>
                                                    <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 검색 전: 둘러보기 섹션 */}
                {!searchQuery && (
                    <>
                        {/* 카테고리 그리드 */}
                        {categories.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-base font-black text-foreground mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-violet-500" /> 카테고리
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {categories.map((cat: any) => (
                                        <Link
                                            key={cat.id}
                                            href={`/?categoryId=${cat.id}`}
                                            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all active:scale-95"
                                        >
                                            <div className="text-2xl mb-2">{cat.icon || "🎬"}</div>
                                            <p className="text-sm font-bold text-foreground">{cat.name}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 인기 영상 */}
                        {trendingVideos.length > 0 && (
                            <div className="mb-8">
                                <h3 className="text-base font-black text-foreground mb-4 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-rose-500" /> 인기 영상
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {trendingVideos.map((v: any, i: number) => (
                                        <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                            <Link
                                                href={`/videos/${v.id}`}
                                                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-lg transition-all active:scale-[0.98]"
                                            >
                                                <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative">
                                                    {v.signedThumbnailUrl ? (
                                                        <img src={v.signedThumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-slate-300" /></div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-sm font-bold text-foreground line-clamp-1">{v.title}</p>
                                                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                                                        <span>{v.owner?.chineseName || v.owner?.name}</span>
                                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{v.viewCount}</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 빠른 링크 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Link href="/community" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center hover:shadow-md transition-all active:scale-95">
                                <Users className="w-6 h-6 mx-auto mb-2 text-violet-500" />
                                <p className="text-sm font-bold text-foreground">커뮤니티</p>
                            </Link>
                            <Link href="/announcements" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center hover:shadow-md transition-all active:scale-95">
                                <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                <p className="text-sm font-bold text-foreground">공지사항</p>
                            </Link>
                            <Link href="/faq" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center hover:shadow-md transition-all active:scale-95">
                                <HelpCircle className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                                <p className="text-sm font-bold text-foreground">FAQ</p>
                            </Link>
                            <Link href="/guide" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-center hover:shadow-md transition-all active:scale-95">
                                <Compass className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                <p className="text-sm font-bold text-foreground">이용 가이드</p>
                            </Link>
                        </div>
                    </>
                )}
            </main>
            <PublicFooter />
        </div>
    );
}
