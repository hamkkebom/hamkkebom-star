"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageSquare, MoreVertical, Flag, CornerDownRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date-utils";
import { ReportDialog } from "@/components/community/report-dialog";

type CommentSectionProps = {
  postId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  comments: any[];
  isQnA: boolean;
  isPostAuthor: boolean;
  acceptedAnswerId: string | null;
  user: { id: string; role: string } | null;
};

export function CommentSection({
  postId,
  comments,
  isQnA,
  isPostAuthor,
  acceptedAnswerId,
  user,
}: CommentSectionProps) {
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [localAcceptedAnswerId, setLocalAcceptedAnswerId] = useState<string | null>(null);

  const acceptedId = localAcceptedAnswerId ?? acceptedAnswerId ?? null;

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const res = await fetch(`/api/board/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      setCommentContent("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ["board-post-detail", postId] });
      toast.success("댓글이 등록되었습니다.");
    },
    onError: () => toast.error("댓글 등록에 실패했습니다."),
  });

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/board/posts/${postId}/comments/${commentId}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to like comment");
      return res.json();
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ["board-post-detail", postId] });
      const previousData = queryClient.getQueryData(["board-post-detail", postId]);
      const wasLiked = commentLikes[commentId] ?? false;
      setCommentLikes((prev) => ({ ...prev, [commentId]: !wasLiked }));
      queryClient.setQueryData(["board-post-detail", postId], (old: { data?: { comments?: { id: string; likeCount: number; children?: { id: string; likeCount: number }[] }[] } } | undefined) => {
        if (!old?.data?.comments) return old;
        const updateComment = (c: { id: string; likeCount: number; children?: { id: string; likeCount: number }[] }) => {
          if (c.id === commentId) {
            return { ...c, likeCount: wasLiked ? c.likeCount - 1 : c.likeCount + 1 };
          }
          if (c.children) {
            return { ...c, children: c.children.map((r: { id: string; likeCount: number }) => r.id === commentId ? { ...r, likeCount: wasLiked ? r.likeCount - 1 : r.likeCount + 1 } : r) };
          }
          return c;
        };
        return { ...old, data: { ...old.data, comments: old.data.comments.map(updateComment) } };
      });
      return { previousData };
    },
    onError: (_err, commentId, context) => {
      queryClient.setQueryData(["board-post-detail", postId], context?.previousData);
      setCommentLikes((prev) => ({ ...prev, [commentId]: !(prev[commentId] ?? false) }));
      toast.error("좋아요 처리에 실패했습니다.");
    },
    onSuccess: (response, commentId) => {
      setCommentLikes((prev) => ({ ...prev, [commentId]: response.data?.liked ?? false }));
      queryClient.invalidateQueries({ queryKey: ["board-post-detail", postId] });
    },
  });

  const acceptAnswerMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/board/posts/${postId}/accept-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) throw new Error("Failed to accept answer");
      return res.json();
    },
    onMutate: async (commentId: string) => {
      setLocalAcceptedAnswerId(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-post-detail", postId] });
      toast.success("답변이 채택되었습니다.");
    },
    onError: () => {
      setLocalAcceptedAnswerId(null);
      toast.error("답변 채택에 실패했습니다.");
    },
  });

  return (
    <div className="border-t border-border pt-8">
      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        댓글 {comments?.length || 0}
      </h3>

      <div className="mb-8 bg-muted/30 p-4 rounded-xl border border-border">
        <Textarea
          placeholder={user ? "댓글을 남겨보세요." : "로그인 후 댓글을 작성할 수 있습니다."}
          className="min-h-[100px] resize-none bg-background mb-3"
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          disabled={!user || commentMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            onClick={() => commentMutation.mutate({ content: commentContent })}
            disabled={!user || !commentContent.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending ? "등록 중..." : "댓글 등록"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {comments?.map((comment: any) => (
          <div key={comment.id} className={cn("group", isQnA && acceptedId === comment.id && "rounded-lg border-2 border-green-500/50 bg-green-500/5 p-4 -mx-4")}>
            {isQnA && acceptedId === comment.id && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-medium mb-3">
                <CheckCircle2 className="w-4 h-4" />
                채택된 답변
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                {comment.author.avatarUrl ? (
                  <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-violet-100 text-violet-600 text-xs font-bold">
                    {(comment.author.chineseName || comment.author.name).charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.author.chineseName || comment.author.name}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ReportDialog targetType="COMMENT" targetId={comment.id}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 cursor-pointer">
                            <Flag className="mr-2 h-4 w-4" />
                            신고하기
                          </DropdownMenuItem>
                        </ReportDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => commentLikeMutation.mutate(comment.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                    disabled={!user || commentLikeMutation.isPending}
                  >
                    <Heart className={cn("w-3.5 h-3.5", (commentLikes[comment.id] ?? false) && "fill-current text-red-500")} />
                    {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                  </button>
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    답글 달기
                  </button>
                  {isQnA && isPostAuthor && acceptedId !== comment.id && (
                    <button
                      onClick={() => acceptAnswerMutation.mutate(comment.id)}
                      className="text-xs text-muted-foreground hover:text-green-600 dark:hover:text-green-400 font-medium flex items-center gap-1"
                      disabled={acceptAnswerMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      답변 채택
                    </button>
                  )}
                </div>
              </div>
            </div>

            {replyTo === comment.id && (
              <div className="mt-3 ml-11 flex gap-2">
                <Textarea
                  placeholder="답글을 입력하세요..."
                  className="min-h-[80px] text-sm resize-none"
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                />
                <Button
                  className="h-auto"
                  onClick={() => commentMutation.mutate({ content: commentContent, parentId: comment.id })}
                  disabled={!commentContent.trim() || commentMutation.isPending}
                >
                  등록
                </Button>
              </div>
            )}

            {comment.children?.length > 0 && (
              <div className="mt-4 space-y-4 ml-11">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {comment.children.map((reply: any) => (
                  <div key={reply.id} className="flex gap-3">
                    <CornerDownRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    <div className="w-6 h-6 rounded-full bg-muted overflow-hidden shrink-0 mt-1">
                      {reply.author.avatarUrl ? (
                        <img src={reply.author.avatarUrl} alt={reply.author.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-violet-100 text-violet-600 text-[10px] font-bold">
                          {(reply.author.chineseName || reply.author.name).charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{reply.author.chineseName || reply.author.name}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                        <div className="ml-auto">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <ReportDialog targetType="COMMENT" targetId={reply.id}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 cursor-pointer">
                                  <Flag className="mr-2 h-4 w-4" />
                                  신고하기
                                </DropdownMenuItem>
                              </ReportDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mb-2">{reply.content}</p>
                      <button
                        onClick={() => commentLikeMutation.mutate(reply.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                        disabled={!user || commentLikeMutation.isPending}
                      >
                        <Heart className={cn("w-3.5 h-3.5", (commentLikes[reply.id] ?? false) && "fill-current text-red-500")} />
                        {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
