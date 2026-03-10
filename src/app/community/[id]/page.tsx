"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeft, Heart, MessageSquare, Eye, Share2, Trash2,
    Send, Clock, Pin, Loader2
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

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
    const day = Math.floor(hr / 24);
    return day < 30 ? `${day}일 전` : new Date(dateStr).toLocaleDateString("ko-KR");
}

export default function CommunityDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const [commentInput, setCommentInput] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyInput, setReplyInput] = useState("");

    const { data: post, isLoading } = useQuery({
        queryKey: ["board-post", id],
        queryFn: async () => {
            const res = await fetch(`/api/board/posts/${id}`);
            if (!res.ok) throw new Error("Not found");
            const json = await res.json();
            return json.data;
        },
    });

    const likeMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/board/posts/${id}/like`, { method: "POST" });
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-post", id] }),
    });

    const commentMutation = useMutation({
        mutationFn: async (data: { content: string; parentId?: string }) => {
            const res = await fetch(`/api/board/posts/${id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board-post", id] });
            setCommentInput("");
            setReplyInput("");
            setReplyTo(null);
            toast.success("댓글이 등록되었습니다.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/board/posts/${id}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("삭제되었습니다.");
            router.push("/community");
        },
    });

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
                <PublicHeader />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
                <PublicHeader />
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    게시글을 찾을 수 없습니다.
                </div>
            </div>
        );
    }

    const canDelete = user && (user.id === post.authorId || user.role === "ADMIN");

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
            <PublicHeader />
            <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
                {/* 뒤로가기 */}
                <Link href="/community" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    목록으로
                </Link>

                {/* 게시글 본문 */}
                <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                            {BOARD_LABELS[post.boardType] || post.boardType}
                        </span>
                        {post.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                    </div>

                    <h1 className="text-xl font-black text-foreground mb-3">{post.title}</h1>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                            {(post.author.chineseName || post.author.name).charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{post.author.chineseName || post.author.name}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(post.createdAt)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.viewCount}</span>
                    </div>

                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mb-6">
                        {post.content}
                    </div>

                    {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {post.tags.map((tag: string) => (
                                <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-800 text-muted-foreground px-2.5 py-1 rounded-lg">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => user ? likeMutation.mutate() : toast.error("로그인이 필요합니다.")}
                            className="gap-1.5 text-muted-foreground hover:text-rose-500 active:scale-95"
                        >
                            <Heart className="w-4 h-4" />
                            {post._count.likes}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                            <MessageSquare className="w-4 h-4" />
                            {post._count.comments}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("링크가 복사되었습니다."); }}
                        >
                            <Share2 className="w-4 h-4" />
                            공유
                        </Button>
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto gap-1.5 text-rose-500 hover:text-rose-600"
                                onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(); }}
                            >
                                <Trash2 className="w-4 h-4" />
                                삭제
                            </Button>
                        )}
                    </div>
                </article>

                {/* 댓글 섹션 */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h3 className="text-sm font-black text-foreground mb-4">
                        댓글 {post._count.comments}개
                    </h3>

                    {/* 댓글 작성 */}
                    {user && (
                        <div className="flex gap-2 mb-5">
                            <input
                                value={commentInput}
                                onChange={(e) => setCommentInput(e.target.value)}
                                placeholder="댓글을 입력하세요..."
                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                onKeyDown={(e) => { if (e.key === "Enter" && commentInput.trim()) commentMutation.mutate({ content: commentInput }); }}
                            />
                            <Button
                                size="sm"
                                disabled={!commentInput.trim() || commentMutation.isPending}
                                onClick={() => commentMutation.mutate({ content: commentInput })}
                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* 댓글 목록 */}
                    <div className="space-y-3">
                        {(post.comments || []).map((comment: any) => (
                            <div key={comment.id}>
                                <div className="flex items-start gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                                        {(comment.author.chineseName || comment.author.name).charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-bold text-foreground">{comment.author.chineseName || comment.author.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-foreground">{comment.content}</p>
                                        <button
                                            onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyInput(""); }}
                                            className="text-[11px] text-muted-foreground hover:text-violet-500 mt-1"
                                        >
                                            답글
                                        </button>

                                        {/* 대댓글 입력 */}
                                        {replyTo === comment.id && user && (
                                            <div className="flex gap-2 mt-2">
                                                <input
                                                    value={replyInput}
                                                    onChange={(e) => setReplyInput(e.target.value)}
                                                    placeholder="답글을 입력하세요..."
                                                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    onKeyDown={(e) => { if (e.key === "Enter" && replyInput.trim()) commentMutation.mutate({ content: replyInput, parentId: comment.id }); }}
                                                    autoFocus
                                                />
                                                <Button
                                                    size="sm"
                                                    disabled={!replyInput.trim()}
                                                    onClick={() => commentMutation.mutate({ content: replyInput, parentId: comment.id })}
                                                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs h-8 px-3"
                                                >
                                                    등록
                                                </Button>
                                            </div>
                                        )}

                                        {/* 대댓글 목록 */}
                                        {comment.children?.length > 0 && (
                                            <div className="mt-2 ml-3 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-2">
                                                {comment.children.map((reply: any) => (
                                                    <div key={reply.id} className="flex items-start gap-2">
                                                        <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0 mt-0.5">
                                                            {(reply.author.chineseName || reply.author.name).charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[11px] font-bold text-foreground">{reply.author.chineseName || reply.author.name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                                                            </div>
                                                            <p className="text-xs text-foreground">{reply.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
