"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame, MessageSquare } from "lucide-react";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Dummy interface for now
interface HotPost {
  post: {
    id: string;
    title: string;
    likeCount: number;
    commentCount: number;
    score: number;
  };
  rank: number;
  rankChange: "up" | "down" | "same" | "new";
}

export function HotPostsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-hot-posts"],
    queryFn: async () => {
      const res = await fetch("/api/board/hot-posts");
      if (!res.ok) throw new Error("Failed to fetch hot posts");
      return res.json() as Promise<{ data: HotPost[] }>;
    },
    staleTime: 60 * 1000,
  });

  return (
    <SidebarWidget
      title="실시간 인기글"
      icon={<Flame className="w-4 h-4 text-orange-500 animate-pulse-subtle" />}
      moreLink="/community?sort=popular"
      moreLabel="더보기"
      className="border-orange-500/20 shadow-[0_4px_16px_-4px_rgba(249,115,22,0.1)]"
    >
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-[90%]" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          ))
        ) : (
          data?.data.map((item, idx) => (
            <Link 
              key={item.post.id} 
              href={`/community/${item.post.id}`}
              className="group flex gap-3 items-start p-1.5 -mx-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Rank Badge */}
              <div className={cn(
                "w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs shrink-0 mt-0.5",
                idx === 0 ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" : 
                idx === 1 ? "bg-amber-500/10 text-amber-600" :
                idx === 2 ? "bg-yellow-500/10 text-yellow-600" :
                "bg-muted text-muted-foreground font-medium"
              )}>
                {item.rank}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1">
                  {item.post.title}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  {/* Rank Change Indicator */}
                  <span className={cn(
                    "font-bold flex items-center",
                    item.rankChange === "up" ? "text-red-500" :
                    item.rankChange === "down" ? "text-blue-500" :
                    item.rankChange === "new" ? "text-green-500" :
                    "text-muted-foreground"
                  )}>
                    {item.rankChange === "up" ? "▲" : item.rankChange === "down" ? "▼" : item.rankChange === "new" ? "NEW" : "−"}
                  </span>
                  
                  {/* Engagement */}
                  <span className="flex items-center gap-1 opacity-80">
                    <MessageSquare className="w-3 h-3" />
                    {item.post.commentCount}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </SidebarWidget>
  );
}
