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
        className="group flex flex-col h-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 active:scale-[0.98]"
      >
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {post.thumbnailUrl ? (
            <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/50">
              <Camera className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
              <Heart className={cn("h-3.5 w-3.5", likeCount > 0 && "fill-rose-500 text-rose-500")} /> {likeCount}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
              <MessageSquare className={cn("h-3.5 w-3.5", commentCount > 0 && "fill-blue-500 text-blue-500")} /> {commentCount}
            </span>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold tracking-tight h-5">
              {boardLabel}
            </Badge>
          </div>
          <h3 className="font-bold text-[15px] leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors mb-4 mt-auto">
            {post.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border/50">
            <span className="font-medium truncate max-w-[120px]">{authorName}</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <>
      {/* Mobile Card View (hidden on md and above) */}
      <Link
        href={`/community/${post.id}`}
        className={cn(
          "md:hidden group flex flex-col h-full rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 active:scale-[0.98] overflow-hidden shadow-sm",
          post.isNotice && "border-violet-500/30 bg-violet-50/30 dark:bg-violet-950/20"
        )}
      >
        <div className="p-5 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {post.isPinned && <Pin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 fill-current" />}
              {post.boardType === "NOTICE" && <Megaphone className="w-3.5 h-3.5 text-violet-500" />}
              {post.boardType === "QNA" && <HelpCircle className="w-3.5 h-3.5 text-orange-500" />}
              {post.boardType === "TIPS" && <Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
              {post.boardType === "RECRUITMENT" && <Users className="w-3.5 h-3.5 text-emerald-500" />}
              
              <Badge variant={post.isNotice ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
                {boardLabel}
              </Badge>
              
              {post.boardType === "QNA" && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", commentCount > 0 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-orange-500 border-orange-500/30 bg-orange-500/10")}>
                  {commentCount > 0 ? "해결됨" : "미해결"}
                </Badge>
              )}
              
              {post.boardType === "RECRUITMENT" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border text-blue-500 border-blue-500/30 bg-blue-500/10">
                  모집중
                </Badge>
              )}
            </div>
          </div>
          
          <h3 className="text-[15px] sm:text-base font-bold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
            {post.title}
          </h3>
          
          {post.content && (
             <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 mt-auto">
                 {post.content.replace(/<[^>]*>?/gm, '')}
             </p>
          )}

          {post.boardType === "TIPS" && post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto pt-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-5 py-3.5 bg-muted/20 border-t border-border/50 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground/90 truncate max-w-[100px]">{authorName}</span>
            <span className="text-[10px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground shrink-0">
             <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.viewCount}</span>
             <span className={cn("flex items-center gap-1", post.boardType === "TIPS" && likeCount > 0 && "text-rose-500 font-medium")}><Heart className={cn("w-3.5 h-3.5", post.boardType === "TIPS" && likeCount > 0 && "fill-current")} />{likeCount}</span>
             <span className={cn("flex items-center gap-1", post.boardType === "QNA" && commentCount > 0 && "text-emerald-500 font-medium")}><MessageSquare className={cn("w-3.5 h-3.5", post.boardType === "QNA" && commentCount > 0 && "fill-current")} />{commentCount}</span>
          </div>
        </div>
      </Link>

      {/* Desktop List Row View (hidden on mobile) */}
      <Link
        href={`/community/${post.id}`}
        className={cn(
          "hidden md:flex items-center justify-between px-5 py-4 border-b border-border/50 transition-colors bg-card hover:bg-accent/40 active:bg-accent/60 last:border-0 group",
          post.isNotice && "bg-violet-50/20 dark:bg-violet-950/20"
        )}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 shrink-0">
            {post.isPinned && <Pin className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 fill-current" />}
            {post.boardType === "NOTICE" && <Megaphone className="w-3.5 h-3.5 text-violet-500" />}
            {post.boardType === "QNA" && <HelpCircle className="w-3.5 h-3.5 text-orange-500" />}
            {post.boardType === "TIPS" && <Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
            {post.boardType === "RECRUITMENT" && <Users className="w-3.5 h-3.5 text-emerald-500" />}
            
            <Badge variant={post.isNotice ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-5">
              {boardLabel}
            </Badge>
            
            {post.boardType === "QNA" && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", commentCount > 0 ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" : "text-orange-500 border-orange-500/30 bg-orange-500/10")}>
                {commentCount > 0 ? "해결됨" : "미해결"}
              </Badge>
            )}
            
            {post.boardType === "RECRUITMENT" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border text-blue-500 border-blue-500/30 bg-blue-500/10">
                모집중
              </Badge>
            )}
          </div>
          
          <h3 className="text-[15px] font-medium text-foreground truncate group-hover:text-primary transition-colors flex-1">
            {post.title}
          </h3>
          
          {post.boardType === "TIPS" && post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 shrink-0">
              {post.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 shrink-0 text-sm text-muted-foreground">
          <div className="w-[120px] truncate text-[13px] font-medium text-foreground/80">
            {authorName}
          </div>
          <div className="w-[70px] text-right text-[12px]">
            {timeAgo(post.createdAt)}
          </div>
          <div className="w-[140px] flex justify-end gap-3 text-xs">
            <span className="flex items-center gap-1 w-[40px] justify-end"><Eye className="w-3.5 h-3.5" />{post.viewCount}</span>
            <span className={cn("flex items-center gap-1 w-[40px] justify-end", post.boardType === "TIPS" && likeCount > 0 && "text-rose-500 font-medium")}><Heart className={cn("w-3.5 h-3.5", post.boardType === "TIPS" && likeCount > 0 && "fill-current")} />{likeCount}</span>
            <span className={cn("flex items-center gap-1 w-[40px] justify-end", post.boardType === "QNA" && commentCount > 0 && "text-emerald-500 font-medium")}><MessageSquare className={cn("w-3.5 h-3.5", post.boardType === "QNA" && commentCount > 0 && "fill-current")} />{commentCount}</span>
          </div>
        </div>
      </Link>
    </>
  );
}
