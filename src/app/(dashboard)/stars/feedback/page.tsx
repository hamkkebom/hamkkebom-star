"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleHeart,
  Filter,
  Clock,
  AlertCircle,
  Zap,
  Play,
  Sparkles,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
    } | null;
  } | null;
  _count: {
    feedbacks: number;
  } | null;
  video: {
    title: string | null;
    streamUid: string | null;
    thumbnailUrl: string | null;
  } | null;
  aiAnalysis: {
    summary: string;
    status: string;
    scores: Record<string, number>;
  } | null;
  createdAt: string;
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

// --- Data Fetching ---
function fetchSubmissions(filter: string = "ALL"): Promise<MySubmission[]> {
  const query = filter !== "ALL" ? `&filter=${filter}` : "";
  return fetch(`/api/submissions/my?page=1&pageSize=50${query}`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
      return res.json();
    })
    .then((json: { data: MySubmission[] }) =>
      json.data.map(d => ({ ...d, createdAt: d.createdAt || new Date().toISOString() }))
    );
}

// --- Components ---

function ProjectCard({ sub, index }: { sub: MySubmission; index: number }) {
  const hasAi = sub.aiAnalysis?.status === "DONE";
  const feedbackCount = sub._count?.feedbacks ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative w-full"
    >
      <Link href={`/stars/feedback/${sub.id}`} className="block h-full">
        <div className="relative h-full overflow-hidden rounded-[2rem] bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 shadow-xl dark:shadow-2xl backdrop-blur-md transition-all duration-500 hover:border-violet-500/30 hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.2)] dark:hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.3)]">

          {/* Active Border Glow */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Thumbnail Header */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {sub.signedThumbnailUrl ? (
              <Image
                src={sub.signedThumbnailUrl}
                alt={sub.versionTitle || "Project"}
                fill
                unoptimized
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-black flex items-center justify-center">
                <Play className="w-12 h-12 text-zinc-300 dark:text-white/10 fill-current" />
              </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

            {/* Floating Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-black/30 dark:bg-white/10 hover:bg-black/40 dark:hover:bg-white/20 backdrop-blur-md border-white/10 text-white shadow-lg">
                {sub.version.startsWith("v") ? sub.version : `v${sub.version}`}
              </Badge>
            </div>

            {/* Status Indicators (Corner) */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
              {hasAi && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/90 dark:bg-violet-500/80 backdrop-blur text-white text-[10px] font-bold shadow-lg border border-white/10 animate-in fade-in zoom-in duration-300">
                  <Sparkles className="w-3 h-3 text-yellow-300 fill-yellow-300/50" />
                  AI 분석 완료
                </div>
              )}
              {feedbackCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/90 dark:bg-blue-500/80 backdrop-blur text-white text-[10px] font-bold shadow-lg border border-white/10 animate-in fade-in zoom-in duration-300 delay-100">
                  <MessageCircleHeart className="w-3 h-3 text-white" />
                  피드백 {feedbackCount}개
                </div>
              )}
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-2 text-[10px] font-medium text-white/90 dark:text-white/70 mb-1.5">
                <Clock className="w-3 h-3" />
                {formatDate(sub.createdAt)}
                <span className="w-1 h-1 rounded-full bg-white/50 dark:bg-white/30" />
                {sub.duration ? formatDuration(sub.duration) : "-"}
              </div>
              <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 drop-shadow-md group-hover:text-violet-200 transition-colors">
                {sub.versionTitle || sub.video?.title || sub.assignment?.request?.title || "제목 없는 프로젝트"}
              </h3>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4">
            {/* AI Insight Summary */}
            <div className="relative p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-100 dark:border-white/[0.05] group-hover:bg-zinc-100 dark:group-hover:bg-white/[0.06] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded bg-violet-100 dark:bg-violet-500/10 border border-transparent dark:border-violet-500/20">
                  <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-300">AI 요약</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground dark:text-zinc-400 line-clamp-2 min-h-[2.5rem]">
                {hasAi ? sub.aiAnalysis!.summary : "아직 AI 분석 결과가 없습니다. 분석을 시작해보세요!"}
              </p>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex -space-x-2 overflow-hidden">
                {/* Mock Avatars */}
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-slate-800 border border-white dark:border-black flex items-center justify-center text-[8px] text-zinc-500 dark:text-slate-500">
                    User
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors">
                상세보기 <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center ml-1"><Play className="w-2 h-2 fill-current" /></div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// --- Main Page ---

export default function FeedbackPage() {
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: submissions, isLoading, isError } = useQuery({
    queryKey: ["my-submissions-feedback", filter],
    queryFn: () => fetchSubmissions(filter),
  });

  return (
    <div className="min-h-screen space-y-10 pb-32">

      {/* Header */}
      <div className="relative space-y-6 pt-6">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-violet-500 dark:text-violet-400 font-bold"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-400/10 text-sm">✨</span>
            <span>크리에이터 스튜디오</span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-500 dark:from-white dark:via-white dark:to-gray-500">
              피드백 <span className="text-violet-600 dark:text-violet-500">Inbox.</span>
            </h1>

            {/* Search */}
            <div className="relative group w-full md:w-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500" />
              <div className="relative flex items-center bg-background dark:bg-black rounded-xl p-1 border border-border dark:border-white/10">
                <Search className="w-4 h-4 text-muted-foreground ml-3" />
                <input
                  type="text"
                  placeholder="프로젝트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-2 w-[200px] text-foreground dark:text-white placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border dark:border-white/5 pb-6">
          <div className="flex p-1 bg-zinc-100 dark:bg-black/20 backdrop-blur-xl rounded-full border border-zinc-200 dark:border-white/10 w-fit">
            {[
              { id: "ALL", label: "전체 보기", icon: Zap },
              { id: "AI_DONE", label: "AI 분석 완료", icon: Sparkles },
              { id: "HAS_FEEDBACK", label: "피드백 있음", icon: MessageCircleHeart },
            ].map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2",
                    isActive ? "text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFilterBg"
                      className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <f.icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Filter className="w-3.5 h-3.5" />
            {submissions?.length ?? 0}개의 프로젝트
          </div>
        </div>
      </div>

      {/* Grid Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-[2rem] bg-zinc-100 dark:bg-white/5" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-rose-500/30 bg-rose-500/5 rounded-[3rem]">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-rose-200">데이터 로드 실패</h3>
          <p className="text-rose-200/50 mt-1">네트워크 상태를 확인해주세요.</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {submissions
              ?.filter((sub) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const title = sub.assignment?.request?.title ?? "";
                const vTitle = sub.versionTitle ?? "";
                const ver = sub.version ?? "";
                return (
                  title.toLowerCase().includes(q) ||
                  vTitle.toLowerCase().includes(q) ||
                  ver.toLowerCase().includes(q)
                );
              })
              .map((sub, idx) => (
                <ProjectCard key={sub.id} sub={sub} index={idx} />
              ))}
          </AnimatePresence>

          {submissions?.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-32 text-center"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-zinc-100 dark:bg-white/5 mb-6 animate-bounce-slow">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground dark:text-white mb-2">조건에 맞는 프로젝트가 없어요</h3>
              <p className="text-muted-foreground">필터를 변경하거나 새로운 프로젝트를 시작해보세요!</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
