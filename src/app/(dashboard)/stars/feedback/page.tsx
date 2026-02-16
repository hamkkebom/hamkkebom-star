"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  MessageCircleHeart,
  Search,
  Filter,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---

type MySubmission = {
  id: string;
  versionTitle: string | null;
  version: string;
  duration: number | null;
  signedThumbnailUrl: string | null;
  assignment: {
    request: {
      title: string;
    };
  };
  _count: {
    feedbacks: number;
  };
  createdAt: string; // Added for date display
};

// --- Utilities ---

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

// --- Components ---

function FeedbackPulseCard({ sub, index }: { sub: MySubmission; index: number }) {
  const isUnread = index % 3 === 0; // Mock unread status based on index for demo
  const hasAiSummary = true; // Always show AI summary for demo

  return (
    <Link href={`/stars/feedback/${sub.id}`} className="group block mb-6 break-inside-avoid">
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-card border border-border/50 transition-all duration-500 ease-out",
        "group-hover:scale-[1.02] group-hover:shadow-[0_10px_40px_-10px_rgba(124,58,237,0.2)]", // Nano Banana Glow
        isUnread ? "shadow-[0_0_0_1px_rgba(124,58,237,0.5)] animate-pulse-subtle" : "shadow-sm"
      )}>
        {/* Image Section */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {sub.signedThumbnailUrl ? (
            <Image
              src={sub.signedThumbnailUrl}
              alt={sub.versionTitle || "영상 썸네일"}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex gap-2">
            {isUnread && (
              <Badge className="bg-primary text-primary-foreground animate-bounce-slow shadow-lg">
                새 피드백
              </Badge>
            )}
            <Badge variant="secondary" className="backdrop-blur-md bg-secondary/80 hover:bg-secondary/90">
              v{sub.version}
            </Badge>
          </div>

          {/* Bottom Info on Image */}
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/80 mb-1">
              <Clock className="w-3 h-3" />
              {formatDate(sub.createdAt)}
              <span className="mx-1">•</span>
              {sub.duration ? formatDuration(sub.duration) : "-"}
            </div>
            <h3 className="font-bold text-lg leading-snug line-clamp-2 text-shadow-sm">
              {sub?.assignment?.request?.title ?? '제목 없음'}
            </h3>
          </div>
        </div>

        {/* AI Summary / Content Section */}
        <div className="p-4 space-y-3 relative bg-card/50 backdrop-blur-3xl">
          {/* Mock AI Summary - Show on Hover or Always? Let's show pulse style */}
          <div className="relative p-3 rounded-xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin-slow" />
              <span className="text-xs font-bold text-primary">AI 피드백 요약</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {/* Typewriter simulation with CSS or just static for now */}
              <span className="group-hover:text-foreground transition-colors">
                "자막 크기를 120%로 키우고, 배경음악 볼륨을 조금만 더 줄여주세요. 전체적인 톤앤매너는 좋습니다..."
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium group-hover:text-primary transition-colors">
              <MessageCircleHeart className="w-3.5 h-3.5" />
              {sub._count.feedbacks}개의 피드백
            </div>
            <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <span className="text-xs font-bold text-primary flex items-center gap-1">
                확인하기 <span className="text-lg leading-none">→</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- Data Fetching ---

async function fetchMySubmissionsWithFeedback(): Promise<MySubmission[]> {
  const res = await fetch("/api/submissions/my?page=1&pageSize=50&hasFeedback=true", { cache: "no-store" });
  if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
  const json = (await res.json()) as { data: MySubmission[] };
  // Mock createdAt if missing
  return json.data.map(d => ({ ...d, createdAt: new Date().toISOString() }));
}

// --- Main Page ---

export default function FeedbackPage() {
  const { data: submissions, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions-feedback"],
    queryFn: fetchMySubmissionsWithFeedback,
  });

  return (
    <div className="min-h-screen space-y-8 pb-20">
      {/* Header Section */}
      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-medium animate-fade-in-up">
              <span className="inline-block p-1 rounded-full bg-primary/10">👋</span>
              <span className="text-sm">반가워요, 크리에이터님!</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              피드백 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Pulse</span>
            </h1>
            <p className="text-muted-foreground max-w-lg">
              도착한 피드백을 AI가 분석하고 정리해둡니다. <br className="hidden md:block" />
              수정이 필요한 부분을 빠르게 확인하고, 걸작을 완성하세요.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="프로젝트 검색..." className="pl-9 w-[200px] md:w-[260px] bg-background/50 backdrop-blur-sm" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats / Quick Filters (Optional Mock) */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer transition-colors">
          🔥 긴급 수정 (2)
        </Badge>
        <Badge variant="outline" className="px-4 py-1.5 rounded-full hover:bg-muted cursor-pointer transition-colors">
          📥 읽지 않음 (5)
        </Badge>
        <Badge variant="outline" className="px-4 py-1.5 rounded-full hover:bg-muted cursor-pointer transition-colors">
          ✅ 완료됨 (12)
        </Badge>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={`skel-${i}`} className="break-inside-avoid mb-6">
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center text-destructive">
          <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-bold">앗, 피드백을 불러오지 못했어요.</h3>
          <p className="text-sm opacity-80 mt-1">{error instanceof Error ? error.message : "잠시 후 다시 시도해주세요."}</p>
        </div>
      ) : !submissions?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-3xl border-muted-foreground/20">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold mb-2">도착한 피드백이 없어요</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            아직 담당자가 영상을 검토 중이거나, 완벽하게 통과되었을 수도 있겠네요! 🎉
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {submissions.map((sub, idx) => (
            <FeedbackPulseCard key={sub.id} sub={sub} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
