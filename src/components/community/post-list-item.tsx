"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Eye, Pin, HelpCircle, Lightbulb, Camera, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

type PostListItemProps = {
  post: {
    id: string;
    boardType: string;
    title: string;
    isPinned: boolean;
    isNotice: boolean;
    viewCount: number;
    likeCount: number;
    createdAt: string;
    thumbnailUrl?: string | null;
    videoId?: string | null;
    tags?: string[];
    author: { name: string; chineseName: string | null; avatarUrl: string | null; role: string };
    _count: { comments: number; likes: number };
  };
};

const BOARD_TYPE_MAP: Record<string, string> = {
  FREE: "자유",
  QNA: "Q&A",
  TIPS: "제작 팁",
  SHOWCASE: "작품 자랑",
  RECRUITMENT: "협업 모집",
  NOTICE: "공지",
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

export function PostListItem({ post }: PostListItemProps) {
  const authorName = post.author.chineseName || post.author.name;
  const boardLabel = BOARD_TYPE_MAP[post.boardType] || post.boardType;
  const commentCount = post._count?.comments ?? 0;
  const likeCount = post._count?.likes ?? post.likeCount;

  if (post.boardType === "SHOWCASE") {
    return (
      <Link
        href={`/community/${post.id}`}
        className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md"
      >
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {post.thumbnailUrl ? (
            <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/50">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <Heart className="h-3 w-3" /> {likeCount}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <MessageSquare className="h-3 w-3" /> {commentCount}
            </span>
          </div>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {boardLabel}
            </Badge>
            <h3 className="font-bold text-sm line-clamp-1 text-foreground">
              {post.title}
            </h3>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span className="font-medium truncate max-w-[100px]">{authorName}</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/community/${post.id}`}
      className={cn(
        "block p-4 min-h-[56px] transition-colors hover:bg-muted/50 border-b border-border last:border-0",
        post.isNotice && "bg-violet-50/50 dark:bg-violet-950/20",
        post.boardType === "NOTICE" && "border-l-2 border-l-violet-500"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.isPinned && <Pin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 fill-current" />}
            {post.boardType === "NOTICE" && <Megaphone className="w-3.5 h-3.5 text-violet-500" />}
            {post.boardType === "QNA" && <HelpCircle className="w-3.5 h-3.5 text-orange-500" />}
            {post.boardType === "TIPS" && <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />}
            {post.boardType === "RECRUITMENT" && <Users className="w-3.5 h-3.5 text-blue-500" />}
            
            <Badge variant={post.isNotice ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
              {boardLabel}
            </Badge>
            
            {post.boardType === "QNA" && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", commentCount > 0 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-orange-500 border-orange-500/30 bg-orange-500/10")}>
                {commentCount > 0 ? "해결됨" : "미해결"}
              </Badge>
            )}
            
            {post.boardType === "RECRUITMENT" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-blue-500 border-blue-500/30 bg-blue-500/10">
                모집중
              </Badge>
            )}

            <h3 className="font-bold text-base line-clamp-1 text-foreground">
              {post.title}
            </h3>
          </div>
          
          {post.boardType === "TIPS" && post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="font-medium truncate max-w-[100px]">{authorName}</span>
            <span>{timeAgo(post.createdAt)}</span>
            
            <div className="flex items-center gap-3 ml-auto shrink-0">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.viewCount}
              </span>
              <span className={cn("flex items-center gap-1", post.boardType === "TIPS" && likeCount > 0 && "text-rose-500 font-medium")}>
                <Heart className={cn("w-3.5 h-3.5", post.boardType === "TIPS" && likeCount > 0 && "fill-current")} />
                {post.boardType === "TIPS" ? `도움이 됐어요 ${likeCount}` : likeCount}
              </span>
              <span className={cn("flex items-center gap-1", post.boardType === "QNA" && commentCount > 0 && "text-emerald-500 font-medium")}>
                <MessageSquare className={cn("w-3.5 h-3.5", post.boardType === "QNA" && commentCount > 0 && "fill-current")} />
                {post.boardType === "QNA" ? `답변 ${commentCount}` : commentCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
