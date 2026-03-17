"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, MessageSquare, PenSquare, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Contributor {
  rank: number;
  user: {
    id: string;
    name: string;
    chineseName: string | null;
    avatarUrl: string | null;
  };
  postCount: number;
  commentCount: number;
  likeReceived: number;
  score: number;
}

export function TopContributorsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-top-contributors"],
    queryFn: async () => {
      const res = await fetch("/api/board/top-contributors");
      if (!res.ok) throw new Error("Failed to fetch top contributors");
      return res.json() as Promise<{ data: Contributor[] }>;
    },
    staleTime: 30 * 60 * 1000, // 30 mins
  });

  return (
    <SidebarWidget
      title="이번 주 활동왕"
      icon={<Trophy className="w-4 h-4 text-yellow-500" />}
      className="border-yellow-500/20 shadow-[0_4px_16px_-4px_rgba(234,179,8,0.1)]"
    >
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((item, idx) => (
            <div key={item.user.id} className="group relative flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-muted/50 transition-colors">
              {/* Avatar & Rank */}
              <div className="relative shrink-0">
                <div className={cn(
                  "absolute -top-1 -left-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold z-10 border-2 border-card",
                  idx === 0 ? "bg-yellow-400 text-yellow-900 shadow-sm" :
                  idx === 1 ? "bg-slate-300 text-slate-700" :
                  "bg-amber-600 text-white"
                )}>
                  {item.rank}
                </div>
                <div className={cn(
                  "w-10 h-10 rounded-full overflow-hidden border-2 relative",
                  idx === 0 ? "border-yellow-400" : "border-border"
                )}>
                  <Image
                    src={item.user.avatarUrl || "/placeholder-avatar.png"}
                    alt={item.user.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.user.name}
                  </span>
                  {item.user.chineseName && (
                    <span className="text-[10px] text-muted-foreground border px-1 rounded-sm">
                      {item.user.chineseName}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <PenSquare className="w-3 h-3" /> {item.postCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {item.commentCount}
                  </span>
                  {item.likeReceived > 0 && (
                     <span className="flex items-center gap-1 text-pink-500/80">
                       <Heart className="w-3 h-3 fill-pink-500/20" /> {item.likeReceived}
                     </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-center text-muted-foreground py-4">
            아직 활동 내역이 없습니다.
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}
