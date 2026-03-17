"use client";

import { useQuery } from "@tanstack/react-query";
import { PlaySquare, Heart, Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";

interface VideoSummary {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  owner: { name: string };
  _count: { likes: number };
}

interface FeaturedVideoData {
  mainVideo: VideoSummary;
  subVideos: VideoSummary[];
}

export function FeaturedVideoWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-featured-video"],
    queryFn: async () => {
      const res = await fetch("/api/board/featured-video");
      if (!res.ok) throw new Error("Failed to fetch featured video");
      return res.json() as Promise<{ data: FeaturedVideoData | null }>;
    },
    staleTime: 10 * 60 * 1000, // 10 mins
  });

  return (
    <SidebarWidget
      title="추천 영상"
      icon={<PlaySquare className="w-4 h-4 text-rose-500" />}
      moreLink="/videos"
      moreLabel="더보기"
      className="border-rose-500/20 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.1)]"
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full aspect-video rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : data?.data && data.data.mainVideo ? (
          <div className="space-y-3">
            <Link 
              href={`/videos/${data.data.mainVideo.id}`}
              className="group block relative w-full aspect-video rounded-xl overflow-hidden bg-muted"
            >
              <Image
                src={data.data.mainVideo.thumbnailUrl || "/placeholder-video.png"}
                alt={data.data.mainVideo.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/50">
                  <PlaySquare className="w-5 h-5 text-white fill-white/20 ml-0.5" />
                </div>
              </div>
            </Link>
            
            <div className="space-y-1">
              <Link 
                href={`/videos/${data.data.mainVideo.id}`}
                className="text-[13px] font-bold text-foreground line-clamp-2 hover:text-primary transition-colors"
              >
                {data.data.mainVideo.title}
              </Link>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                <span>{data.data.mainVideo.owner.name}</span>
                <span className="flex items-center gap-1 opacity-80">
                  <Eye className="w-3 h-3" /> {data.data.mainVideo.viewCount}
                </span>
                <span className="flex items-center gap-1 opacity-80">
                  <Heart className="w-3 h-3 text-pink-500/80" /> {data.data.mainVideo._count.likes}
                </span>
              </div>
            </div>

            {data.data.subVideos.length > 0 && (
              <div className="pt-2 mt-2 border-t border-border/50 space-y-2">
                {data.data.subVideos.map(sub => (
                  <Link 
                    key={sub.id} 
                    href={`/videos/${sub.id}`}
                    className="flex items-start gap-2 hover:bg-muted/30 p-1 -mx-1 rounded-md transition-colors"
                  >
                    <PlaySquare className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground hover:text-foreground line-clamp-1 transition-colors">
                      {sub.title}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-center text-muted-foreground py-4">
            추천 영상이 없습니다.
          </div>
        )}
      </div>
    </SidebarWidget>
  );
}
