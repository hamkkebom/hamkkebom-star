"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TrendingTag {
  tag: string;
  count: number;
}

export function TrendingTagsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-trending-tags"],
    queryFn: async () => {
      const res = await fetch("/api/board/trending-tags");
      if (!res.ok) throw new Error("Failed to fetch trending tags");
      return res.json() as Promise<{ data: TrendingTag[] }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SidebarWidget
      title="인기 태그"
      icon={<Hash className="w-4 h-4 text-primary" />}
    >
      <div className="flex flex-wrap gap-2">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-7 rounded-full" 
              style={{ width: `${[50, 70, 45, 60, 80, 55, 65, 75][i]}px` }} 
            />
          ))
        ) : (
          data?.data.map((item, idx) => (
            <Link
              key={item.tag}
              href={`/community?q=${item.tag}`}
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] transition-all hover:-translate-y-0.5 whitespace-nowrap",
                idx < 3 ? "bg-primary/15 text-primary font-bold hover:bg-primary/20 hover:shadow-sm" : 
                idx < 6 ? "bg-muted text-foreground/80 font-medium hover:bg-muted-foreground/20" :
                "bg-transparent border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              #{item.tag}
            </Link>
          ))
        )}
      </div>
    </SidebarWidget>
  );
}
