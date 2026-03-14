"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquare, Heart, ChevronRight, Users } from "lucide-react";
import Link from "next/link";

type PostPreview = {
    id: string;
    boardType: string;
    title: string;
    viewCount: number;
    likeCount: number;
    createdAt: string;
    author: { name: string; chineseName: string | null };
    _count: { comments: number; likes: number };
};

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

export function CommunityPreview() {
    const { data } = useQuery({
        queryKey: ["community-preview"],
        queryFn: async () => {
            const res = await fetch("/api/board/posts?pageSize=5&sort=latest");
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []) as PostPreview[];
        },
        staleTime: 2 * 60 * 1000,
    });

    const posts = data || [];

    // 게시글이 없으면 커뮤니티 소개 카드 표시
    if (posts.length === 0) {
        return (
            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-violet-500" />
                        <h2 className="text-lg font-black text-foreground">커뮤니티</h2>
                    </div>
                    <Link href="/community" className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                        바로가기 <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
                <Link
                    href="/community/write"
                    className="block rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center hover:border-violet-400 transition-colors"
                >
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-violet-400" />
                    <p className="font-bold text-foreground">커뮤니티에 첫 글을 작성해보세요!</p>
                    <p className="text-sm text-muted-foreground mt-1">영상 제작 팁, Q&A, 협업 모집 등</p>
                </Link>
            </section>
        );
    }

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-500" />
                    <h2 className="text-lg font-black text-foreground">커뮤니티</h2>
                </div>
                <Link href="/community" className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
                    전체 보기 <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {posts.map((post, i) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Link
                            href={`/community/${post.id}`}
                            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 shrink-0">
                                {BOARD_LABELS[post.boardType] || post.boardType}
                            </span>
                            <span className="flex-1 text-sm font-bold text-foreground truncate">
                                {post.title}
                            </span>
                            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground shrink-0">
                                <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{post._count.comments}</span>
                                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{post._count.likes}</span>
                                <span className="hidden sm:inline">{timeAgo(post.createdAt)}</span>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
