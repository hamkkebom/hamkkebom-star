"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Flame, Clock, Eye, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

type Video = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  streamUid: string | null;
  duration: number | null;
  ownerName: string;
  categoryName: string | null;
  createdAt: string;
  viewCount: number;
  likeCount?: number;
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
};

type ApiResponse = {
  data: Video[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PERIODS = [
  { id: "week", label: "이번 주" },
  { id: "month", label: "이번 달" },
  { id: "year", label: "올해" },
  { id: "all", label: "전체" },
];

const SORTS = [
  { id: "popular", label: "인기순", icon: <Flame className="w-4 h-4 mr-1" /> },
  { id: "latest", label: "최신순", icon: <Clock className="w-4 h-4 mr-1" /> },
];

export default function BestPage() {
  return (
    <Suspense fallback={<BestPageSkeleton />}>
      <BestPageContent />
    </Suspense>
  );
}

function BestPageSkeleton() {
  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
      <Skeleton className="h-10 w-64 mb-3" />
      <Skeleton className="h-6 w-48 mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function BestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const period = searchParams.get("period") || "week";
  const [sort, setSort] = useState("popular");

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["best-videos", period, sort],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort,
        pageSize: "20",
      });

      if (period !== "all") {
        const now = new Date();
        const fromDate = new Date();
        if (period === "week") fromDate.setDate(now.getDate() - 7);
        else if (period === "month") fromDate.setDate(now.getDate() - 30);
        else if (period === "year") fromDate.setDate(now.getDate() - 365);
        
        params.append("dateFrom", fromDate.toISOString());
      }

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch best videos");
      return res.json();
    },
  });

  const handlePeriodChange = (newPeriod: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", newPeriod);
    router.push(`/best?${params.toString()}`);
  };

  const top3 = data?.data.slice(0, 3) || [];
  const rest = data?.data.slice(3) || [];

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 flex items-center justify-center md:justify-start gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          함께봄 베스트
        </h1>
        <p className="text-muted-foreground text-lg">크리에이터들의 최고 작품을 만나보세요</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 hide-scrollbar gap-2 w-full md:w-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriodChange(p.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                period === p.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSort(s.id)}
              className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                sort === s.id
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="aspect-video w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="aspect-video w-full rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">해당 기간의 베스트 영상이 없습니다</h3>
          <p className="text-muted-foreground">다른 기간을 선택해보세요.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Top 3 Section */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 1st Place */}
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lg:col-span-8 relative group rounded-2xl overflow-hidden bg-card border shadow-sm"
                >
                  <Link href={`/videos/${top3[0].id}`} className="block relative aspect-video md:aspect-[21/9] lg:aspect-video">
                    {top3[0].thumbnailUrl ? (
                      <Image
                        src={top3[0].thumbnailUrl}
                        alt={top3[0].title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <Play className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute top-4 left-4 w-12 h-12 bg-yellow-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg border-4 border-white/20">
                      1
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      {top3[0].categoryName && (
                        <Badge className="mb-3 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                          {top3[0].categoryName}
                        </Badge>
                      )}
                      <h2 className="text-2xl md:text-3xl font-bold mb-2 line-clamp-2">{top3[0].title}</h2>
                      <div className="flex items-center gap-4 text-sm text-white/80">
                        <span className="flex items-center gap-1.5">
                          <UserAvatar url={top3[0].owner.avatarUrl} name={top3[0].owner.name} />
                          {top3[0].owner.name}
                        </span>
                        <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {top3[0].viewCount}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* 2nd & 3rd Place */}
              <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
                {top3.slice(1).map((video, idx) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (idx + 1) * 0.1 }}
                    className="relative group rounded-xl overflow-hidden bg-card border shadow-sm h-full"
                  >
                    <Link href={`/videos/${video.id}`} className="block relative aspect-video lg:h-full">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                          <Play className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-md border-2 border-white/20 text-white ${idx === 0 ? 'bg-slate-300 text-slate-800' : 'bg-amber-600'}`}>
                        {idx + 2}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                        <h3 className="text-sm md:text-base font-bold mb-1.5 line-clamp-2">{video.title}</h3>
                        <div className="flex items-center justify-between text-xs text-white/80">
                          <span className="truncate pr-2">{video.owner.name}</span>
                          <span className="flex items-center gap-1 shrink-0"><Eye className="w-3 h-3" /> {video.viewCount}</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 4th-10th Place Grid */}
          {rest.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                인기 급상승
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {rest.slice(0, 8).map((video, idx) => (
                  <div key={video.id} className="relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs font-bold z-10 border shadow-sm">
                      {idx + 4}
                    </div>
                    <VideoCard
                      id={video.id}
                      title={video.title}
                      thumbnailUrl={video.thumbnailUrl}
                      streamUid={video.streamUid}
                      duration={video.duration}
                      ownerName={video.owner.name}
                      categoryName={video.categoryName}
                      createdAt={video.createdAt}
                      viewCount={video.viewCount}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11th-20th Place List */}
          {rest.length > 8 && (
            <div>
              <h3 className="text-xl font-bold mb-6">주목받는 영상</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rest.slice(8).map((video, idx) => (
                  <Link
                    key={video.id}
                    href={`/videos/${video.id}`}
                    className="flex gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border group"
                  >
                    <div className="w-8 text-center font-bold text-muted-foreground/50 self-center">
                      {idx + 12}
                    </div>
                    <div className="relative w-24 md:w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-muted">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Play className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-medium text-sm md:text-base line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {video.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{video.owner.name}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.viewCount}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UserAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="w-5 h-5 rounded-full overflow-hidden relative bg-muted">
        <Image src={url} alt={name} fill className="object-cover" />
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
      {name.charAt(0)}
    </div>
  );
}
