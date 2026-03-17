"use client";

import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt: string;
}

export function AnnouncementsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-announcements"],
    queryFn: async () => {
      const res = await fetch("/api/board/announcements");
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json() as Promise<{ data: Announcement[] }>;
    },
    staleTime: 10 * 60 * 1000, // 10 mins
  });

  const isNew = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours < 72; // 72 hours
  };

  return (
    <SidebarWidget
      title="공지사항"
      icon={<Megaphone className="w-4 h-4 text-primary" />}
      moreLink="/community?boardType=NOTICE"
      moreLabel="전체보기"
    >
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((item) => (
            <Link 
              key={item.id} 
              href={`/community?boardType=NOTICE`} 
              className="group flex gap-2 items-start hover:bg-muted/30 p-1 -mx-1 rounded-md transition-colors"
            >
              <div className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <p className="text-[13px] text-foreground/90 font-medium truncate group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                {isNew(item.createdAt) && (
                  <span className="shrink-0 inline-flex items-center px-1 py-0.5 rounded-[4px] bg-red-500/10 text-red-600 text-[9px] font-bold leading-none">
                    N
                  </span>
                )}
                {item.priority === "URGENT" && (
                  <span className="shrink-0 inline-flex items-center px-1 py-0.5 rounded-[4px] bg-amber-500/10 text-amber-600 text-[9px] font-bold leading-none">
                    필독
                  </span>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}
