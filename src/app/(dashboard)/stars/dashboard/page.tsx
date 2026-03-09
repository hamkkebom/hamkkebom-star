"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleHeart,
  Clock,
  Zap,
  Layers,
  LayoutGrid,
  Briefcase,
  Bell,
  Wallet,
  AlertTriangle,
  FileCheck,
  ArrowRight,
  BarChart3,
  Eye,
  TrendingUp,
  Target,
  Settings2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// --- Types ---
import type { MySubmissionDashboard as MySubmission } from "@/types/shared";

type DashboardStats = {
  activeProjects: number;
  unreadFeedbackCount: number;
  latestSettlement: { id: string; amount: number; status: string; period: string } | null;
  upcomingDeadlines: { assignmentId: string; requestId: string; title: string; deadline: string; daysLeft: number }[];
  submissionCounts: { pending: number; inReview: number; approved: number; rejected: number; revised: number };
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
    month: "short",
    day: "numeric",
  });
}

// Seeded random for consistent hydration
function pseudoRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function fetchSubmissions(): Promise<{ data: MySubmission[], total: number }> {
  return fetch(`/api/submissions/my?page=1&pageSize=50`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
      return res.json();
    });
}

// Hook for responsive detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// Number Counter Animation Hook
function useCounter(end: number, duration: number = 1.5) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) return;
    let startTime: number | null = null;
    let animationFrameId: number;

    const updateCounter = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out expo
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOut * end));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCounter);
      } else {
        setCount(end); // Ensure we end exactly at 'end'
      }
    };
    animationFrameId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animationFrameId);
  }, [end, duration]);
  return count;
}

// --- Components ---

function DraggableCard({ sub, index, isMobile }: { sub: MySubmission; index: number; isMobile: boolean }) {
  const hasAi = sub.aiAnalysis?.status === "DONE";
  const feedbackCount = sub._count?.feedbacks ?? 0;

  // Generate stable random values for desktop scattered mode
  const rand = useMemo(() => pseudoRandom(sub.id), [sub.id]);
  const rotate = isMobile ? 0 : (rand * 12) - 6; // No rotation on mobile
  const xOffset = isMobile ? 0 : (pseudoRandom(sub.id + "x") * 60) - 30; // No offset on mobile
  const yOffset = isMobile ? 0 : (pseudoRandom(sub.id + "y") * 60) - 30; // No offset on mobile
  const zIndexBase = Math.floor(rand * 10);

  return (
    <motion.div
      drag={!isMobile}
      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
      dragElastic={0.2}
      whileHover={isMobile ? undefined : { scale: 1.1, rotate: 0, zIndex: 50, cursor: "grab" }}
      whileTap={{ scale: 0.96, cursor: isMobile ? "pointer" : "grabbing" }}
      initial={{ opacity: 0, y: isMobile ? 50 : 500, rotate: rotate * 3 }}
      animate={{ opacity: 1, y: yOffset, x: xOffset, rotate: rotate }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: isMobile ? index * 0.05 : index * 0.03
      }}
      style={{ zIndex: zIndexBase }}
      className={cn(
        "relative shrink-0 flex-col",
        isMobile ? "w-full" : "w-[160px] sm:w-[200px]"
      )}
    >
      <Link href={`/stars/my-videos/${sub.id}`} className="block h-full perspective-1000">
        <div className={cn(
          "relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 transition-all duration-300 group",
          isMobile ? "rounded-[20px] shadow-sm flex flex-col md:flex-row hover:border-violet-500/50" : "rounded-[14px] shadow-[0_6px_20px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_30px_-8px_rgba(124,58,237,0.3)] hover:border-violet-500/50"
        )}>

          {/* Tape Effect (Desktop Only) */}
          {!isMobile && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-zinc-200/50 dark:bg-white/10 backdrop-blur-sm -rotate-1 z-20 border-l border-r border-white/20 dark:border-white/5 opacity-60" />}

          {/* Thumbnail Image */}
          <div className={cn(
            "relative bg-zinc-100 dark:bg-black overflow-hidden",
            isMobile ? "aspect-video w-full" : "aspect-video"
          )}>
            {sub.signedThumbnailUrl ? (
              <Image
                src={sub.signedThumbnailUrl}
                alt={sub.versionTitle || "Project"}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 200px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                <LayoutGrid className="w-6 h-6 text-zinc-300 dark:text-zinc-800" />
              </div>
            )}

            {/* Glowing Gradient Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Version Badge */}
            <div className="absolute top-3 left-3 -rotate-3 group-hover:rotate-0 transition-transform">
              <Badge className="bg-white/90 dark:bg-black/80 hover:bg-white dark:hover:bg-black text-foreground dark:text-white border-zinc-200 dark:border-white/10 backdrop-blur font-mono text-[9px] px-1.5 h-5 shadow-sm">
                {sub.version.startsWith("v") ? sub.version : `v${sub.version}`}
              </Badge>
            </div>

            {/* K-Casual Indicators */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
              {hasAi && (
                <div className="bg-black/60 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/10">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                </div>
              )}
              {feedbackCount > 0 && (
                <div className="bg-black/60 backdrop-blur-md rounded-full p-1 shadow-lg border border-white/10 flex items-center gap-1">
                  <MessageCircleHeart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]" />
                  <span className="text-[9px] font-bold text-white pl-0.5 pr-1">{feedbackCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Info */}
          <div className={cn(
            "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm relative flex flex-col justify-center",
            isMobile ? "p-4" : "px-2.5 py-2"
          )}>
            <h3 className={cn(
              "font-bold text-foreground dark:text-zinc-100 leading-tight line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors",
              isMobile ? "text-base mb-1" : "text-[11px] mb-0.5"
            )}>
              {sub.versionTitle || sub.video?.title || sub.assignment?.request?.title || "제목 없는 프로젝트"}
            </h3>
            <div className={cn(
              "flex items-center justify-between text-muted-foreground dark:text-zinc-500 font-medium",
              isMobile ? "text-xs mt-1" : "text-[9px]"
            )}>
              <span className="flex items-center gap-1">
                <Clock className={cn("w-3 h-3 transition-colors group-hover:text-violet-500")} />
                {formatDate(sub.createdAt)}
              </span>
              <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">{sub.duration ? formatDuration(sub.duration) : "-"}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function StarDashboardPage() {
  const isMobile = useIsMobile();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-submissions-creative"],
    queryFn: fetchSubmissions,
  });

  // KPI 데이터
  const { data: stats } = useQuery({
    queryKey: ["star-dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/submissions/my/stats", { cache: "no-store" });
      if (!res.ok) throw new Error("stats fetch failed");
      return res.json().then((r: { data: DashboardStats }) => r.data);
    },
    refetchInterval: 60_000,
  });

  const submissions = data?.data;
  const totalCount = data?.total ?? 0;

  // Dopamine-driven animated counter
  const animatedCount = useCounter(totalCount);

  const kpiCards = useMemo(() => {
    if (!stats) return [];
    return [
      { icon: Briefcase, label: "진행 중", value: stats.activeProjects, color: "text-violet-400", bg: "bg-violet-500/10", href: "/stars/project-board" },
      { icon: Bell, label: "미확인 피드백", value: stats.unreadFeedbackCount, color: "text-rose-400", bg: "bg-rose-500/10", href: "/stars/feedback", pulse: stats.unreadFeedbackCount > 0 },
      { icon: FileCheck, label: "승인됨", value: stats.submissionCounts.approved, color: "text-emerald-400", bg: "bg-emerald-500/10", href: "/stars/my-videos" },
      { icon: Wallet, label: "최근 정산", value: stats.latestSettlement ? `${Math.round(stats.latestSettlement.amount / 10000)}만원` : "-", color: "text-amber-400", bg: "bg-amber-500/10", href: "/stars/earnings" },
    ];
  }, [stats]);

  // 영상 통계 트렌드
  type VideoStatMonth = { month: string; submitted: number; approved: number; feedbacks: number };
  type VideoStatSummary = { totalViews: number; approvalRate: number; totalSubmissions: number };

  const { data: videoStats } = useQuery({
    queryKey: ["video-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stars/video-stats", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as { data: VideoStatMonth[]; summary: VideoStatSummary };
    },
  });

  // 목표 달성률
  type GoalData = {
    goal: { submissions: number; approvals: number; earnings: number };
    actual: { submissions: number; approvals: number; earnings: number };
    progress: { submissions: number; approvals: number; earnings: number };
    overallProgress: number;
    month: string;
  };

  const { data: goalData } = useQuery({
    queryKey: ["star-goals"],
    queryFn: async () => {
      const res = await fetch("/api/stars/goals", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()).data as GoalData;
    },
  });

  const [isGoalEditOpen, setIsGoalEditOpen] = useState(false);
  const [editGoal, setEditGoal] = useState({ submissions: 4, approvals: 3, earnings: 500000 });

  const goalMutation = useMutation({
    mutationFn: async (goal: { submissions: number; approvals: number; earnings: number }) => {
      const res = await fetch("/api/stars/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["star-goals"] });
      setIsGoalEditOpen(false);
    },
  });

  const queryClient = useQueryClient();

  return (
    <div className={cn(
      "relative w-full overflow-hidden bg-background text-foreground dark:bg-black dark:text-white selection:bg-violet-500/30 transition-colors duration-500",
      isMobile ? "-m-4 p-4 min-h-screen" : "-m-6 p-6 min-h-[calc(100vh-4rem)]" // tight on mobile
    )}>

      {/* 1. Background Typography (The "Mega Counter") */}
      <div className={cn(
        "fixed inset-0 z-0 flex flex-col items-center justify-center pointer-events-none select-none overflow-hidden transition-all duration-700",
        isMobile ? "opacity-30 origin-top" : "opacity-100"
      )}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn(
            "relative text-center leading-none flex flex-col items-center justify-center transition-all duration-700",
            isMobile ? "scale-50 -translate-y-[20vh]" : "scale-100"
          )}
        >
          <h1 className={cn(
            "font-black text-zinc-100 dark:text-zinc-900 tracking-tighter mix-blend-difference transition-all duration-500",
            isMobile ? "text-[40vw] opacity-100" : "text-[25vw] md:text-[35vw] opacity-40 dark:opacity-20"
          )}>
            {animatedCount}
          </h1>
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-zinc-300 dark:text-zinc-800 tracking-[1em] uppercase blur-[0.5px] transition-all duration-500",
            isMobile ? "text-[5vw] mt-[15vw]" : "text-[2vw] mt-[10vw]"
          )}>
            전체 제작물
          </div>
        </motion.div>

        {/* Dynamic Gradients (Neon K-Casual Vibe) */}
        {!isMobile && (
          <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-violet-500/10 dark:bg-violet-900/15 rounded-full blur-[100px] animate-pulse-slow transition-colors duration-500 shadow-[0_0_100px_rgba(139,92,246,0.3)]" />
        )}
      </div>

      {/* 2. Header Layer (Sticky on Mobile) */}
      <div className={cn(
        "relative z-20 flex flex-col gap-2 mb-8 pointer-events-none",
        isMobile && "sticky top-0 pt-2 pb-4 bg-gradient-to-b from-background via-background/90 to-transparent backdrop-blur-sm -mx-4 px-4"
      )}>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-2 text-violet-500 font-bold uppercase tracking-widest text-xs"
        >
          <Layers className="w-4 h-4" />
          <span>크리에이티브 대시보드</span>
        </motion.div>
        <h1 className="text-3xl md:text-6xl font-black tracking-tighter text-foreground dark:text-white drop-shadow-2xl flex items-center gap-2">
          마이 스튜디오<span className="text-violet-600 animate-pulse">.</span>
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm max-w-md backdrop-blur-sm">
          {isMobile ? "스크롤하여 아카이브를 탐색하세요." : "작품을 드래그하여 당신만의 아카이브를 자유롭게 탐색해보세요."}
        </p>
      </div>

      {/* 2.5 KPI Cards */}
      {kpiCards.length > 0 && (
        <div className="relative z-20 mb-6">
          <div className={cn(
            "grid gap-3",
            isMobile ? "grid-cols-2" : "grid-cols-4"
          )}>
            {kpiCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Link href={card.href}>
                  <div className={cn(
                    "relative p-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] dark:bg-white/[0.02] backdrop-blur-sm",
                    "hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 group cursor-pointer",
                    "hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]",
                    card.pulse && "border-rose-500/30 bg-rose-500/5"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.bg)}>
                        <card.icon className={cn("w-4.5 h-4.5", card.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                        <p className={cn("text-xl font-black tracking-tight", card.pulse && "text-rose-400")}>
                          {card.value}
                        </p>
                      </div>
                    </div>
                    {card.pulse && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 2.6 목표 달성률 */}
      {goalData && (
        <div className="relative z-20 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-white/[0.03] dark:bg-white/[0.02] border-white/[0.06] backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-500" />
                    이달의 목표
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (goalData) setEditGoal(goalData.goal);
                      setIsGoalEditOpen(true);
                    }}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  {/* 원형 전체 진행률 */}
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
                      <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke="url(#goalGrad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${goalData.overallProgress} ${100 - goalData.overallProgress}`}
                        className="transition-all duration-700"
                      />
                      <defs>
                        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black">{goalData.overallProgress}%</span>
                    </div>
                  </div>
                  {/* 항목별 프로그레스 바 */}
                  <div className="flex-1 space-y-3">
                    {[
                      { label: "제출", actual: goalData.actual.submissions, goal: goalData.goal.submissions, progress: goalData.progress.submissions, unit: "건", color: "bg-violet-500" },
                      { label: "승인", actual: goalData.actual.approvals, goal: goalData.goal.approvals, progress: goalData.progress.approvals, unit: "건", color: "bg-emerald-500" },
                      { label: "수입", actual: goalData.actual.earnings, goal: goalData.goal.earnings, progress: goalData.progress.earnings, unit: "원", color: "bg-amber-500", format: true },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-bold">
                            {item.format ? `${Math.round(item.actual / 10000)}만` : item.actual}/{item.format ? `${Math.round(item.goal / 10000)}만${item.unit}` : `${item.goal}${item.unit}`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", item.color)}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* 2.6 Deadline Alerts */}
      {stats?.upcomingDeadlines && stats.upcomingDeadlines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 mb-6"
        >
          <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">마감 임박</span>
            </div>
            <div className="space-y-2">
              {stats.upcomingDeadlines.map((d) => (
                <Link key={d.assignmentId} href={`/stars/upload`} className="block">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group">
                    <span className="text-sm font-medium text-slate-200 truncate flex-1">{d.title}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold border",
                        d.daysLeft <= 1 ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      )}>
                        D-{d.daysLeft}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. The "Scattered Archive" OR "Mobile Grid" Area */}
      <div className={cn(
        "relative z-10 w-full",
        isMobile ? "pb-20" : "min-h-[60vh] flex items-center justify-center" // Mobile has pb-20 to clear bottom nav better visually
      )}>
        {isLoading ? (
          <div className={cn(
            "flex justify-center flex-wrap animate-pulse",
            isMobile ? "flex-col gap-4" : "gap-4"
          )}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={cn(
                "bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-border dark:border-white/5",
                isMobile ? "w-full h-64" : "w-64 h-48"
              )} />
            ))}
          </div>
        ) : (
          <div className={cn(
            "w-full max-w-[1600px] mx-auto",
            isMobile
              ? "flex flex-col gap-5 pt-4" // Clean mobile list
              : "flex flex-wrap justify-center items-center content-center gap-4 p-10" // Scattered desktop pile
          )}>
            {submissions?.map((sub, idx) => (
              <div key={sub.id} className={cn(
                "transition-all duration-300",
                isMobile ? "" : "-m-4 md:-m-6 hover:z-50"
              )}>
                <DraggableCard sub={sub} index={idx} isMobile={isMobile} />
              </div>
            ))}

            {submissions?.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg mx-auto py-10"
              >
                <Card className="bg-white/[0.04] dark:bg-white/[0.02] border-white/[0.08] backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-lg font-black">환영합니다! 🎉</h3>
                      <p className="text-sm text-muted-foreground">아래 단계를 따라 첫 작품을 시작해보세요</p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {[
                        { step: 1, label: "프로필 완성하기", desc: "은행 정보와 기본 프로필을 설정하세요", href: "/stars/settings", icon: "👤" },
                        { step: 2, label: "게시판에서 프로젝트 찾기", desc: "관심 있는 제작 요청을 탐색하고 수락하세요", href: "/stars/project-board", icon: "📋" },
                        { step: 3, label: "영상 업로드", desc: "제작한 영상을 업로드하고 제출하세요", href: "/stars/upload", icon: "🎬" },
                        { step: 4, label: "피드백 확인 & 수정", desc: "관리자 피드백을 확인하고 수정본을 제출하세요", href: "/stars/feedback", icon: "💬" },
                      ].map((item, i) => (
                        <Link key={item.step} href={item.href}>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.1 }}
                            className="flex items-center gap-4 p-3.5 rounded-xl border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform">
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-md">STEP {item.step}</span>
                                <span className="text-sm font-bold truncate">{item.label}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors shrink-0" />
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* 영상 통계 트렌드 */}
      {videoStats && videoStats.data.some((d) => d.submitted > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                영상 통계 트렌드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  총 조회수 {videoStats.summary.totalViews.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  승인율 {videoStats.summary.approvalRate}%
                </div>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={videoStats.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: string) => v.split("-")[1] + "월"}
                      stroke="var(--muted-foreground)"
                      opacity={0.5}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" opacity={0.5} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(label: any) => {
                        const [y, m] = String(label).split("-");
                        return `${y}년 ${parseInt(m)}월`;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="submitted" name="제출" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="승인" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="feedbacks" name="피드백" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 목표 편집 다이얼로그 */}
      <Dialog open={isGoalEditOpen} onOpenChange={setIsGoalEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              이달의 목표 설정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: "월 제출 목표 (건)", key: "submissions" as const },
              { label: "월 승인 목표 (건)", key: "approvals" as const },
              { label: "월 수입 목표 (원)", key: "earnings" as const },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">{field.label}</label>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={editGoal[field.key]}
                  onChange={(e) => setEditGoal((prev) => ({ ...prev, [field.key]: Number(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGoalEditOpen(false)}>취소</Button>
            <Button
              onClick={() => goalMutation.mutate(editGoal)}
              disabled={goalMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {goalMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
