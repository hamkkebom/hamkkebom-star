"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, Play, Youtube, Instagram, Video as VideoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import Image from "next/image";

type Placement = {
  id: string;
  medium: string;
  placementType: string | null;
  campaignName: string | null;
  channel: string | null;
  startDate: string | null;
  url: string | null;
  videoId: string;
  video: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    owner: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  };
};

type Stats = {
  total: number;
  youtube: number;
  instagram: number;
  tiktok: number;
  other: number;
};

type ApiResponse = {
  data: Placement[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: Stats;
};

const TABS = ["전체", "YouTube", "Instagram", "TikTok", "기타"];

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState("전체");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["placements", activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "12",
      });
      if (activeTab !== "전체") {
        params.append("medium", activeTab);
      }
      const res = await fetch(`/api/placements/public?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch placements");
      return res.json();
    },
  });

  const getPlatformIcon = (medium: string) => {
    const m = medium.toLowerCase();
    if (m === "youtube") return <Youtube className="w-3 h-3 mr-1" />;
    if (m === "instagram") return <Instagram className="w-3 h-3 mr-1" />;
    if (m === "tiktok") return <VideoIcon className="w-3 h-3 mr-1" />;
    return <ExternalLink className="w-3 h-3 mr-1" />;
  };

  const getPlatformColor = (medium: string) => {
    const m = medium.toLowerCase();
    if (m === "youtube") return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-900/50";
    if (m === "instagram") return "bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-900/50";
    if (m === "tiktok") return "bg-slate-800/10 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700";
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">우리 영상이 활약하는 곳</h1>
        <p className="text-muted-foreground text-lg">다양한 매체에서 활용되는 함께봄 크리에이터의 영상</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "전체", count: data?.stats?.total ?? 0, icon: <VideoIcon className="w-5 h-5" /> },
          { label: "YouTube", count: data?.stats?.youtube ?? 0, icon: <Youtube className="w-5 h-5" /> },
          { label: "Instagram", count: data?.stats?.instagram ?? 0, icon: <Instagram className="w-5 h-5" /> },
          { label: "TikTok", count: data?.stats?.tiktok ?? 0, icon: <VideoIcon className="w-5 h-5" /> },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm"
          >
            <div>
              <div className="text-sm text-muted-foreground font-medium mb-1">{stat.label}</div>
              <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-12" /> : stat.count}</div>
            </div>
            <div className="text-muted-foreground/50 bg-muted p-2 rounded-full">{stat.icon}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-6 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPage(1);
            }}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed">
          <VideoIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">해당 매체의 영상이 없습니다</h3>
          <p className="text-muted-foreground">다른 매체를 선택해보세요.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {data?.data.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group flex flex-col bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <Link href={`/videos/${item.videoId}`} className="relative aspect-video overflow-hidden bg-muted block">
                  {item.video.thumbnailUrl ? (
                    <Image
                      src={item.video.thumbnailUrl}
                      alt={item.video.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </Link>

                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-[10px] md:text-xs px-1.5 py-0 md:px-2 md:py-0.5 ${getPlatformColor(item.medium)}`}>
                      {getPlatformIcon(item.medium)}
                      {item.medium}
                    </Badge>
                  </div>
                  
                  <h3 className="font-medium text-sm md:text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                    {item.video.title}
                  </h3>
                  
                  {item.campaignName && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-3">
                      {item.campaignName}
                    </p>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                    <Link href={`/videos/${item.videoId}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full text-xs h-8">
                        원본 보기
                      </Button>
                    </Link>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          매체 이동
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <div className="flex items-center px-4 text-sm font-medium">
                {page} / {data.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
