"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, Heart, MessageSquare, Share2, Trash2, CornerDownRight, MoreVertical, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { ReportDialog } from "@/components/community/report-dialog";

const BOARD_TYPE_MAP: Record<string, string> = {
  FREE: "자유", QNA: "Q&A", TIPS: "제작 팁", SHOWCASE: "작품 자랑", RECRUITMENT: "협업 모집", NOTICE: "공지",
};

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "방금 전";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const [commentContent, setCommentContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["board-post-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/board/posts/${id}`);
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/board/posts/${id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to like");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["board-post-detail", id] });
      const previousData = queryClient.getQueryData(["board-post-detail", id]);
      queryClient.setQueryData(["board-post-detail", id], (old: unknown) => {
        const prev = old as { data?: { likeCount: number } } | undefined;
        if (!prev?.data) return old;
        return {
          ...prev,
          data: {
            ...prev.data,
            likeCount: prev.data.likeCount + 1,
          }
        };
      });
      return { previousData };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["board-post-detail", id], context?.previousData);
      toast.error("좋아요 처리에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board-post-detail", id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const res = await fetch(`/api/board/posts/${id}/comments`, {
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
      queryClient.invalidateQueries({ queryKey: ["board-post-detail", id] });
      toast.success("댓글이 등록되었습니다.");
    },
    onError: () => toast.error("댓글 등록에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/board/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      toast.success("게시글이 삭제되었습니다.");
      router.push("/community");
    },
    onError: () => toast.error("게시글 삭제에 실패했습니다."),
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("링크가 클립보드에 복사되었습니다.");
  };

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-8">
        <Skeleton className="h-8 w-24 mb-6" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">게시글을 찾을 수 없습니다.</h2>
        <p className="text-muted-foreground mb-6">삭제되었거나 존재하지 않는 게시글입니다.</p>
        <Button asChild><Link href="/community">목록으로 돌아가기</Link></Button>
      </div>
    );
  }

  const post = data.data;
  const authorName = post.author.chineseName || post.author.name;
  const isAuthorOrAdmin = user?.id === post.author.id || user?.role === "ADMIN";

  useEffect(() => {
    if (post) {
      try {
        const stored = localStorage.getItem("community_recent_posts");
        let parsed: any[] = [];
        if (stored) {
           parsed = JSON.parse(stored);
        }
        
        // Remove existing entry for this post
        parsed = parsed.filter(p => p.id !== post.id);
        
        // Add to front
        parsed.unshift({
          id: post.id,
          title: post.title,
          boardType: post.boardType,
          viewedAt: Date.now(),
          author: authorName
        });
        
        // Keep only top 10
        parsed = parsed.slice(0, 10);
        
        localStorage.setItem("community_recent_posts", JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to save recent post", e);
      }
    }
  }, [post, authorName]);

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-8">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground">
        <Link href="/community"><ChevronLeft className="w-4 h-4 mr-1" /> 목록으로</Link>
      </Button>

      <div className="mb-8">
        <Badge variant="secondary" className="mb-3">{BOARD_TYPE_MAP[post.boardType] || post.boardType}</Badge>
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">{post.title}</h1>
        
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-violet-100 text-violet-600 font-bold">
                  {authorName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium">{authorName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(post.createdAt))}</span>
                <span>·</span>
                <span>조회 {post.viewCount}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}><Share2 className="w-4 h-4" /></Button>
            {isAuthorOrAdmin && (
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("정말 삭제하시겠습니까?")) deleteMutation.mutate(); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ReportDialog targetType="POST" targetId={post.id}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 cursor-pointer">
                    <Flag className="mr-2 h-4 w-4" />
                    신고하기
                  </DropdownMenuItem>
                </ReportDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="min-h-[200px] whitespace-pre-wrap text-base leading-relaxed mb-8 text-foreground">
        {post.content}
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {post.tags.map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-muted-foreground bg-muted/30">#{tag}</Badge>
          ))}
        </div>
      )}

      <div className="flex justify-center mb-12">
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-full px-6 gap-2"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
        >
          <Heart className={cn("w-5 h-5", likeMutation.isPending ? "animate-pulse" : "")} />
          <span>좋아요 {post.likeCount}</span>
        </Button>
      </div>

      <div className="border-t border-border pt-8">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          댓글 {post.comments?.length || 0}
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
          {post.comments?.map((comment: { id: string; content: string; createdAt: string; author: { name: string; chineseName?: string; avatarUrl?: string }; children?: { id: string; content: string; createdAt: string; author: { name: string; chineseName?: string; avatarUrl?: string } }[] }) => (
            <div key={comment.id} className="group">
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
                  <button 
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    답글 달기
                  </button>
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

              {comment.children && comment.children.length > 0 && (
                <div className="mt-4 space-y-4 ml-11">
                  {comment.children.map((reply) => (
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
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
