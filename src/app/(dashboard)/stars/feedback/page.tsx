"use client";

import { useState, memo } from "react";
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
  Search,
  Brush,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---

import type { MySubmissionFeedback as MySubmission } from "@/types/shared";

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

const typeLabels: Record<string, string> = {
  GENERAL: "일반",
  SUBTITLE: "자막",
  BGM: "BGM",
  CUT_EDIT: "컷편집",
  COLOR_GRADE: "색보정",
};

const priorityColors: Record<string, string> = {
  URGENT: "text-rose-400",
  HIGH: "text-amber-400",
  NORMAL: "text-blue-400",
  LOW: "text-slate-400",
};

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

const ProjectCard = memo(function ProjectCard({ sub, index }: { sub: MySubmission; index: number }) {
  const feedbackCount = sub._count?.feedbacks ?? 0;
  const unread = sub.unreadFeedbackCount ?? 0;
  const latest = sub.latestFeedback;
  const hasDrawing = latest?.annotation != null;

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
        <div className={cn(
          "relative h-full overflow-hidden rounded-[2rem] bg-white dark:bg-black/40 border shadow-xl dark:shadow-2xl backdrop-blur-md transition-all duration-500 hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.2)] dark:hover:shadow-[0_20px_40px_-10px_rgba(124,58,237,0.3)]",
          unread > 0
            ? "border-rose-500/40 hover:border-rose-500/60 dark:border-rose-500/30 dark:hover:border-rose-500/50"
            : "border-zinc-200 dark:border-white/5 hover:border-violet-500/30"
        )}>

          {/* Active Border Glow — 미확인이 있으면 rose glow */}
          <div className={cn(
            "absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r transition-opacity duration-500",
            unread > 0
              ? "from-transparent via-rose-500 to-transparent opacity-70 group-hover:opacity-100"
              : "from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100"
          )} />

          {/* Thumbnail Header */}
          <div className="relative aspect-[16/10] overflow-hidden">
            {sub.signedThumbnailUrl ? (
              <Image
                src={sub.signedThumbnailUrl}
                alt={sub.versionTitle || "Project"}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-zinc-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-black flex items-center justify-center">
                <Play className="w-12 h-12 text-zinc-300 dark:text-white/10 fill-current" />
              </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 dark:from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

            {/* 좌상단 뱃지 */}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-black/30 dark:bg-white/10 hover:bg-black/40 dark:hover:bg-white/20 backdrop-blur-md border-white/10 text-white shadow-lg">
                {sub.version.startsWith("v") ? sub.version : `v${sub.version}`}
              </Badge>
            </div>

            {/* 🔴 우상단: 미확인 피드백 카운트 (초강조) */}
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end gap-1.5 sm:gap-2">
              {unread > 0 && (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/90 backdrop-blur text-white text-[10px] sm:text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.5)] border border-white/20"
                >
                  <Bell className="w-3 h-3 animate-bounce" />
                  미확인 {unread}건
                </motion.div>
              )}
              {feedbackCount > 0 && unread === 0 && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-500/80 backdrop-blur text-white text-[9px] sm:text-[10px] font-bold shadow-lg border border-white/10">
                  <MessageCircleHeart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  모두 확인 ✓
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

          {/* Content Body — 관리자 피드백 중심 */}
          <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
            {/* 피드백 요약 영역 */}
            <div className={cn(
              "relative p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border transition-colors",
              unread > 0
                ? "bg-rose-500/5 dark:bg-rose-500/[0.03] border-rose-500/20 group-hover:bg-rose-500/10 dark:group-hover:bg-rose-500/[0.06]"
                : feedbackCount > 0
                  ? "bg-blue-500/5 dark:bg-white/[0.03] border-blue-500/10 dark:border-white/[0.05] group-hover:bg-blue-500/10 dark:group-hover:bg-white/[0.06]"
                  : "bg-zinc-50 dark:bg-white/[0.03] border-zinc-100 dark:border-white/[0.05] group-hover:bg-zinc-100 dark:group-hover:bg-white/[0.06]"
            )}>
              {feedbackCount > 0 ? (
                <>
                  {/* 피드백 통계 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1 rounded border",
                        unread > 0
                          ? "bg-rose-500/10 dark:bg-rose-500/10 border-rose-500/20"
                          : "bg-blue-100 dark:bg-blue-500/10 border-transparent dark:border-blue-500/20"
                      )}>
                        <MessageCircleHeart className={cn(
                          "w-3 h-3",
                          unread > 0 ? "text-rose-500" : "text-blue-600 dark:text-blue-400"
                        )} />
                      </div>
                      <span className={cn(
                        "text-[10px] sm:text-xs font-bold",
                        unread > 0 ? "text-rose-500" : "text-blue-600 dark:text-blue-300"
                      )}>
                        관리자 피드백 {feedbackCount}건
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {unread > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                          🔴 미확인 {unread}
                        </span>
                      )}
                      {hasDrawing && (
                        <span className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                          <Brush className="w-2.5 h-2.5" /> 드로잉
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 최근 피드백 미리보기 */}
                  {latest && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-bold", priorityColors[latest.priority] ?? "text-slate-400")}>
                          [{typeLabels[latest.type] ?? latest.type}]
                        </span>
                        <span className="text-[9px] text-muted-foreground/70 font-medium">
                          {latest.author?.name}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground dark:text-zinc-400 line-clamp-2">
                        &ldquo;{latest.content}&rdquo;
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-zinc-100 dark:bg-white/5 border border-transparent dark:border-white/10">
                    <MessageCircleHeart className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-medium">
                    아직 피드백이 없습니다
                  </span>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-1 sm:pt-2">
              <div className="flex items-center gap-2">
                {/* 피드백 상태 서머리 */}
                {feedbackCount > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-medium">
                    <span className="text-emerald-500">{feedbackCount - unread} 확인</span>
                    {unread > 0 && (
                      <>
                        <span className="text-muted-foreground/30">/</span>
                        <span className="text-rose-500 font-bold">{unread} 대기</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-muted-foreground group-hover:text-foreground dark:group-hover:text-white transition-colors">
                {unread > 0 ? "지금 확인하기" : "상세보기"}
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center ml-1">
                  <Play className="w-2 h-2 sm:w-2 sm:h-2 fill-current" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

// --- Main Page ---

export default function FeedbackPage() {
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: submissions, isLoading, isError } = useQuery({
    queryKey: ["my-submissions-feedback", filter],
    queryFn: () => fetchSubmissions(filter),
  });

  // 미확인 피드백 총합
  const totalUnread = submissions?.reduce((sum, s) => sum + (s.unreadFeedbackCount ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen space-y-10 pb-32">

      {/* Header */}
      <div className="relative space-y-4 sm:space-y-6 pt-4 sm:pt-6">
        <div className="space-y-2">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-violet-500 dark:text-violet-400 font-bold"
          >
            <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-violet-100 dark:bg-violet-400/10 text-xs sm:text-sm">✨</span>
            <span className="text-xs sm:text-sm">크리에이터 스튜디오</span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-500 dark:from-white dark:via-white dark:to-gray-500">
                피드백 <span className="text-violet-600 dark:text-violet-500">Inbox.</span>
              </h1>
              {totalUnread > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-500 text-white text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                >
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                  {totalUnread}건 미확인
                </motion.div>
              )}
            </div>

            {/* Search */}
            <div className="relative group w-full md:w-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur opacity-20 group-hover:opacity-60 transition duration-500" />
              <div className="relative flex items-center bg-background dark:bg-black rounded-xl p-1 border border-border dark:border-white/10 w-full sm:w-auto">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="프로젝트 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-2.5 sm:p-2 w-full sm:w-[200px] md:w-[240px] text-foreground dark:text-white placeholder:text-muted-foreground/50 h-10 sm:h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border dark:border-white/5 pb-4 sm:pb-6 relative z-10">
          <div className="w-[calc(100vw-32px)] sm:w-auto overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <div className="flex p-1 sm:p-1.5 bg-zinc-100 dark:bg-black/20 backdrop-blur-xl rounded-full border border-zinc-200 dark:border-white/10 w-max shrink-0">
              {[
                { id: "ALL", label: "전체 보기", icon: Zap },
                { id: "UNREAD", label: "미확인 있음", icon: Bell },
                { id: "HAS_FEEDBACK", label: "피드백 있음", icon: MessageCircleHeart },
                { id: "AI_DONE", label: "AI 분석", icon: Sparkles },
              ].map((f) => {
                const isActive = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "relative px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 select-none active:scale-95",
                      isActive ? "text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:text-white dark:hover:bg-white/5"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeFilterBg"
                        className={cn(
                          "absolute inset-0 rounded-full",
                          f.id === "UNREAD"
                            ? "bg-gradient-to-r from-rose-600 to-rose-500"
                            : "bg-gradient-to-r from-violet-600 to-fuchsia-600"
                        )}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                      <f.icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isActive && "animate-pulse")} />
                      {f.label}
                      {f.id === "UNREAD" && totalUnread > 0 && !isActive && (
                        <span className="ml-0.5 min-w-4 h-4 px-1 text-[9px] font-black bg-rose-500 text-white rounded-full inline-flex items-center justify-center">
                          {totalUnread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground font-medium self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
              .sort((a, b) => {
                // 미확인 피드백이 있는 것을 위로
                if (a.unreadFeedbackCount > 0 && b.unreadFeedbackCount === 0) return -1;
                if (a.unreadFeedbackCount === 0 && b.unreadFeedbackCount > 0) return 1;
                return 0;
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
