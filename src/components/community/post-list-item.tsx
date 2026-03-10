"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Heart, Eye, Pin } from "lucide-react";
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

  return (
    <Link
      href={`/community/${post.id}`}
      className={cn(
        "block p-4 min-h-[56px] transition-colors hover:bg-muted/50 border-b border-border last:border-0",
        post.isNotice && "bg-violet-50/50 dark:bg-violet-950/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.isPinned && <Pin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 fill-current" />}
            <Badge variant={post.isNotice ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
              {boardLabel}
            </Badge>
            <h3 className="font-bold text-base line-clamp-1 text-foreground">
              {post.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="font-medium truncate max-w-[100px]">{authorName}</span>
            <span>{timeAgo(post.createdAt)}</span>
            
            <div className="flex items-center gap-3 ml-auto shrink-0">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {post._count?.likes ?? post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {post._count?.comments ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
