"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
    MessageSquare, Heart, Eye, Pin, Plus, Search, ChevronRight,
    Filter, TrendingUp, Clock, MessageCircle, Sparkles
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

const BOARD_TYPES = [
    { value: "", label: "전체", icon: Sparkles },
    { value: "FREE", label: "자유", icon: MessageSquare },
    { value: "QNA", label: "Q&A", icon: MessageCircle },
    { value: "TIPS", label: "제작 팁", icon: TrendingUp },
    { value: "SHOWCASE", label: "작품 자랑", icon: Eye },
    { value: "RECRUITMENT", label: "협업 모집", icon: Plus },
    { value: "NOTICE", label: "공지", icon: Pin },
];

const SORT_OPTIONS = [
    { value: "latest", label: "최신순", icon: Clock },
    { value: "popular", label: "인기순", icon: Heart },
    { value: "comments", label: "댓글순", icon: MessageSquare },
];

type BoardPost = {
    id: string;
    boardType: string;
    title: string;
    content: string;
    authorId: string;
    isPinned: boolean;
    isNotice: boolean;
    viewCount: number;
    likeCount: number;
    tags: string[];
    createdAt: string;
    author: { id: string; name: string; chineseName: string | null; avatarUrl: string | null; role: string };
    _count: { comments: number; likes: number };
};

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금 전";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
}

function getBoardTypeLabel(type: string) {
    return BOARD_TYPES.find(b => b.value === type)?.label || type;
}

export default function CommunityPage() {
    const [boardType, setBoardType] = useState("");
    const [sort, setSort] = useState("latest");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const user = useAuthStore((s) => s.user);

    const { data, isLoading } = useQuery({
        queryKey: ["board-posts", boardType, sort, page, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (boardType) params.set("boardType", boardType);
            params.set("sort", sort);
            params.set("page", String(page));
            params.set("pageSize", "20");
            if (search) params.set("q", search);
            const res = await fetch(`/api/board/posts?${params}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const posts: BoardPost[] = data?.data || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
            <PublicHeader />
            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-black text-foreground">커뮤니티</h1>
                    {user && (
                        <Link href="/community/write">
                            <Button className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                                <Plus className="w-4 h-4" />
                                글쓰기
                            </Button>
                        </Link>
                    )}
                </div>

                {/* 카테고리 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
                    {BOARD_TYPES.map((bt) => {
                        const Icon = bt.icon;
                        const isActive = boardType === bt.value;
                        return (
                            <button
                                key={bt.value}
                                onClick={() => { setBoardType(bt.value); setPage(1); }}
                                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 ${isActive
                                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                                        : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {bt.label}
                            </button>
                        );
                    })}
                </div>

                {/* 검색 + 정렬 */}
                <div className="flex gap-2 mb-4">
                    <form
                        onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
                        className="flex-1 relative"
                    >
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="검색..."
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </form>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        {SORT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setSort(opt.value); setPage(1); }}
                                className={`px-3 py-2.5 text-xs font-bold transition-colors ${sort === opt.value
                                        ? "bg-violet-600 text-white"
                                        : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 게시글 목록 */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 animate-pulse">
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-lg">아직 게시글이 없어요</p>
                        <p className="text-sm mt-1">첫 번째 글을 작성해보세요!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {posts.map((post, i) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Link
                                    href={`/community/${post.id}`}
                                    className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 transition-all active:scale-[0.99]"
                                >
                                    <div className="flex items-start gap-3">
                                        {/* 고정/공지 뱃지 */}
                                        {(post.isPinned || post.isNotice) && (
                                            <Pin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                                    {getBoardTypeLabel(post.boardType)}
                                                </span>
                                                {post.tags.slice(0, 2).map((tag) => (
                                                    <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                                                ))}
                                            </div>
                                            <h3 className="text-sm font-bold text-foreground line-clamp-1 mb-1">
                                                {post.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                                {post.content.replace(/[#*_~`]/g, "").slice(0, 80)}
                                            </p>
                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                <span className="font-medium">{post.author.chineseName || post.author.name}</span>
                                                <span>{timeAgo(post.createdAt)}</span>
                                                <span className="flex items-center gap-0.5">
                                                    <MessageSquare className="w-3 h-3" />
                                                    {post._count.comments}
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <Heart className="w-3 h-3" />
                                                    {post._count.likes}
                                                </span>
                                                <span className="flex items-center gap-0.5">
                                                    <Eye className="w-3 h-3" />
                                                    {post.viewCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = page <= 3 ? i + 1 : page + i - 2;
                            if (p < 1 || p > totalPages) return null;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${p === page
                                            ? "bg-violet-600 text-white shadow"
                                            : "bg-white dark:bg-slate-900 text-muted-foreground border border-slate-200 dark:border-slate-800"
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
            <PublicFooter />
        </div>
    );
}
