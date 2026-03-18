"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { MessageSquare, Heart, Send, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

type CommentAuthor = {
    id: string;
    name: string;
    chineseName: string | null;
    avatarUrl: string | null;
    role: string;
};

type Comment = {
    id: string;
    content: string;
    likeCount: number;
    isLiked: boolean;
    createdAt: string;
    author: CommentAuthor;
    children: Comment[];
    _count: { children: number; likes: number };
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

export function VideoComments({ videoId }: { videoId: string }) {
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const [input, setInput] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyInput, setReplyInput] = useState("");
    const [sort, setSort] = useState<"latest" | "popular">("latest");

    const { data, isLoading } = useQuery({
        queryKey: ["video-comments", videoId, sort],
        queryFn: async () => {
            const res = await fetch(`/api/videos/${videoId}/comments?sort=${sort}&limit=30`);
            if (!res.ok) return { data: [], totalCount: 0 };
            return res.json();
        },
    });

    const comments: Comment[] = data?.data || [];
    const totalCount = data?.totalCount || 0;

    const postComment = useMutation({
        mutationFn: async (body: { content: string; parentId?: string }) => {
            const res = await fetch(`/api/videos/${videoId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] });
            setInput("");
            setReplyInput("");
            setReplyTo(null);
        },
        onError: () => toast.error("댓글 작성에 실패했습니다."),
    });

    const toggleLike = useMutation({
        mutationFn: async (commentId: string) => {
            const res = await fetch(`/api/videos/${videoId}/comments/${commentId}/like`, { method: "POST" });
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["video-comments", videoId] }),
    });

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-violet-500" />
                    댓글 {totalCount > 0 && <span className="text-violet-500">{totalCount}</span>}
                </h3>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
                    <button onClick={() => setSort("latest")} className={`px-3 py-1.5 font-bold ${sort === "latest" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}>최신</button>
                    <button onClick={() => setSort("popular")} className={`px-3 py-1.5 font-bold ${sort === "popular" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}>인기</button>
                </div>
            </div>

            {/* 댓글 작성 */}
            {user ? (
                <div className="flex gap-2 mb-5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(user.name || "U").charAt(0)}
                    </div>
                    <div className="flex-1 flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) postComment.mutate({ content: input }); }}
                        />
                        <button
                            disabled={!input.trim() || postComment.isPending}
                            onClick={() => postComment.mutate({ content: input })}
                            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 disabled:opacity-50 active:scale-95 transition-all"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground mb-4">댓글을 작성하려면 로그인하세요.</p>
            )}

            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
            ) : comments.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment, index) => (
                        <div key={comment.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}>
                            <div className="flex gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(comment.author.chineseName || comment.author.name).charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-foreground">{comment.author.chineseName || comment.author.name}</span>
                                        {comment.author.role === "ADMIN" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">관리자</span>}
                                        <span className="text-[11px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-foreground mb-1.5">{comment.content}</p>
                                    <div className="flex items-center gap-3 text-xs">
                                        <button
                                            onClick={() => user ? toggleLike.mutate(comment.id) : toast.error("로그인이 필요합니다.")}
                                            className={`flex items-center gap-1 transition-colors ${comment.isLiked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
                                        >
                                            <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-current" : ""}`} />
                                            {comment.likeCount > 0 && comment.likeCount}
                                        </button>
                                        <button
                                            onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyInput(""); }}
                                            className="text-muted-foreground hover:text-violet-500"
                                        >
                                            답글 {comment._count.children > 0 && `(${comment._count.children})`}
                                        </button>
                                    </div>

                                    {/* 대댓글 입력 */}
                                    {replyTo === comment.id && user && (
                                        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                            <div className="flex gap-2 mt-2">
                                                <input
                                                    value={replyInput}
                                                    onChange={(e) => setReplyInput(e.target.value)}
                                                    placeholder="답글을 입력하세요..."
                                                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                                                    onKeyDown={(e) => { if (e.key === "Enter" && replyInput.trim()) postComment.mutate({ content: replyInput, parentId: comment.id }); }}
                                                    autoFocus
                                                />
                                                <button
                                                    disabled={!replyInput.trim()}
                                                    onClick={() => postComment.mutate({ content: replyInput, parentId: comment.id })}
                                                    className="rounded-lg bg-violet-600 text-white text-xs px-3 py-2 disabled:opacity-50 active:scale-95"
                                                >
                                                    등록
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 대댓글 목록 */}
                                    {comment.children?.length > 0 && (
                                        <div className="mt-2 ml-2 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-2.5">
                                            {comment.children.map((reply) => (
                                                <div key={reply.id} className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                                        {(reply.author.chineseName || reply.author.name).charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-0.5">
                                                            <span className="text-xs font-bold text-foreground">{reply.author.chineseName || reply.author.name}</span>
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
            )}
        </div>
    );
}
