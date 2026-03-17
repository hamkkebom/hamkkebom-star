"use client";

import { useQuery } from "@tanstack/react-query";
import { Bookmark, MessageSquare, Eye } from "lucide-react";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

interface BookmarkItem {
  id: string;
  createdAt: string;
  post: {
    id: string;
    title: string;
    boardType: string;
    author: { name: string };
    commentCount: number;
    viewCount: number;
  };
}

export function BookmarksWidget() {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ["board-bookmarks-sidebar"],
    queryFn: async () => {
      const res = await fetch("/api/board/bookmarks-sidebar");
      if (!res.ok) {
        if (res.status === 401) return { data: null };
        throw new Error("Failed to fetch bookmarks");
      }
      return res.json() as Promise<{ data: BookmarkItem[] | null }>;
    },
    enabled: !!user, // 로그인 한 경우에만 페칭
    staleTime: 30 * 1000,
  });

  return (
    <SidebarWidget
      title="내 북마크"
      icon={<Bookmark className="w-4 h-4 text-primary fill-primary/20" />}
      moreLink="/community?tab=bookmarks"
      moreLabel="전체보기"
    >
      <div className="space-y-3">
        {authLoading || (user && isLoading) ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 p-1">
              <Skeleton className="h-4 w-11/12" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          ))
        ) : !user ? (
          <div className="text-center py-5 space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground/50">
              <Bookmark className="w-5 h-5" />
            </div>
            <p className="text-sm text-muted-foreground">로그인하면 북마크를<br/>확인할 수 있어요</p>
            <Link 
              href="/auth/login" 
              className="inline-block text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors"
            >
              로그인하기
            </Link>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((item) => (
            <Link 
              key={item.id} 
              href={`/community/post/${item.post.id}`} 
              className="group block hover:bg-muted/30 p-2 -mx-2 rounded-lg transition-colors"
            >
              <p className="text-[13px] text-foreground font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight mb-1.5">
                {item.post.title}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground/70">{item.post.author.name}</span>
                <span className="flex items-center gap-1 opacity-80">
                  <Eye className="w-3 h-3" /> {item.post.viewCount}
                </span>
                <span className="flex items-center gap-1 opacity-80">
                  <MessageSquare className="w-3 h-3" /> {item.post.commentCount}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">
            저장한 북마크가 없습니다.
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}
