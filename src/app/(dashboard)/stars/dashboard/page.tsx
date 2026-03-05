"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleHeart,
  Clock,
  Zap,
  Layers,
  LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    padding?: boolean;
    status: string;
    summary: string;
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

  const submissions = data?.data;
  const totalCount = data?.total ?? 0;

  // Dopamine-driven animated counter
  const animatedCount = useCounter(totalCount);

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
              <div className="text-center py-20 w-full">
                <p className="text-muted-foreground text-lg mb-4">아직 제작된 작품이 없습니다.</p>
                <Link href="/stars/upload">
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-500/40 transform transition-transform hover:scale-105 active:scale-95">
                    새 프로젝트 시작하기
                    <Zap className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
