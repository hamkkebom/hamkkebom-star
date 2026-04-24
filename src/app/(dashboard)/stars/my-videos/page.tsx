"use client";

import Image from "next/image";
import Link from "next/link";
import { Info, MoreVertical, Upload, Play, Eye, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionList } from "@/components/video/submission-list";
import { cn } from "@/lib/utils";

type DirectVideo = {
  id: string;
  title: string | null;
  streamUid: string;
  signedThumbnailUrl: string | null;
  status: string;
  viewCount: number;
  createdAt: string;
  category: { name: string } | null;
};

function DirectVideoSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-direct-videos"],
    queryFn: async () => {
      const res = await fetch("/api/videos/mine", { cache: "no-store" });
      if (!res.ok) return { data: [] as DirectVideo[] };
      return res.json() as Promise<{ data: DirectVideo[] }>;
    },
  });

  const videos = data?.data ?? [];
  if (!isLoading && videos.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
          <Upload className="w-3 h-3 text-white" />
        </div>
        <h2 className="text-sm font-bold text-foreground">직접 업로드 영상</h2>
        {!isLoading && videos.length > 0 && (
          <span className="text-xs text-muted-foreground font-medium">{videos.length}개</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {videos.map((v) => (
            <Link key={v.id} href={`/videos/${v.id}`} target="_blank">
              <div className="group rounded-xl overflow-hidden border border-border/60 bg-card hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black">
                  {v.signedThumbnailUrl ? (
                    <Image
                      src={v.signedThumbnailUrl}
                      alt={v.title ?? ""}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      v.status === "APPROVED"
                        ? "bg-emerald-500 text-white"
                        : "bg-muted/80 text-muted-foreground backdrop-blur-sm"
                    )}>
                      {v.status === "APPROVED" ? "공개중" : v.status}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">
                    {v.title ?? "제목 없음"}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    {v.category && (
                      <span className="text-[10px] text-muted-foreground truncate">{v.category.name}</span>
                    )}
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto shrink-0">
                      <Eye className="w-2.5 h-2.5" />
                      {v.viewCount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-indigo-500/80">
        <CheckCircle2 className="w-3 h-3" />
        <span>직접 업로드 영상은 즉시 공개됩니다. 클릭하면 공개 페이지로 이동합니다.</span>
      </div>
    </section>
  );
}

export default function MyVideosPage() {
  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">내 영상 관리</h1>
        <p className="text-sm text-muted-foreground">
          업로드한 모든 영상의 상태와 버전을 확인하세요.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 text-sm text-amber-900/80 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-200/80 transition-all hover:bg-amber-50/80 dark:hover:bg-amber-950/40">
        <Info className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium text-amber-700 dark:text-amber-400">영상 삭제 가이드</p>
          <p className="leading-relaxed">
            아직 <span className="font-semibold text-amber-600 dark:text-amber-300">대기중(Pending)</span> 상태인 영상은 카드 우측의
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-amber-100 dark:bg-amber-900/50 align-middle mx-1"><MoreVertical className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /></span>
            아이콘을 눌러 삭제할 수 있습니다.
            <br />
            <span className="text-xs text-amber-700/60 dark:text-amber-400/60 block mt-1.5">* 이미 리뷰가 시작된 영상은 소중한 피드백 기록을 위해 삭제가 제한됩니다.</span>
          </p>
        </div>
      </div>

      <SubmissionList />

      {/* 직접 업로드 영상 섹션 (있을 때만 표시) */}
      <DirectVideoSection />
    </div>
  );
}
