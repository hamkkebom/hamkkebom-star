"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircleHeart,
  Search,
  Sparkles,
  Clock,
  Zap,
  Play,
  Layers,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
    month: "long",
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

// Fetch submissions (increased limit for 'pile' effect)
function fetchSubmissions(): Promise<{ data: MySubmission[], total: number }> {
  return fetch(`/api/submissions/my?page=1&pageSize=50`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
      return res.json();
    });
}

// --- Components ---

function DraggableCard({ sub, index }: { sub: MySubmission; index: number }) {
  const hasAi = sub.aiAnalysis?.status === "DONE";
  const feedbackCount = sub._count?.feedbacks ?? 0;

  // Generate stable random values
  const rand = useMemo(() => pseudoRandom(sub.id), [sub.id]);
  const rotate = (rand * 12) - 6; // -6 ~ +6 deg
  const xOffset = (pseudoRandom(sub.id + "x") * 60) - 30; // -30 ~ +30 px
  const yOffset = (pseudoRandom(sub.id + "y") * 60) - 30; // -30 ~ +30 px
  const zIndexBase = Math.floor(rand * 10);

  return (
    <motion.div
      drag
      dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
      dragElastic={0.2}
      whileHover={{ scale: 1.1, rotate: 0, zIndex: 50, cursor: "grab" }}
      whileTap={{ scale: 0.95, cursor: "grabbing" }}
      initial={{ opacity: 0, y: 500, rotate: rotate * 3 }}
      animate={{ opacity: 1, y: yOffset, x: xOffset, rotate: rotate }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay: index * 0.03
      }}
      style={{ zIndex: zIndexBase }}
      className="relative shrink-0 w-[160px] sm:w-[200px]"
    >
      <Link href={`/stars/my-videos/${sub.id}`} className="block h-full perspective-1000">
        <div className="relative overflow-hidden rounded-[14px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 group hover:shadow-[0_12px_30px_-8px_rgba(124,58,237,0.3)] dark:hover:shadow-[0_12px_30px_-8px_rgba(124,58,237,0.4)] hover:border-violet-500/50">

          {/* Tape Effect */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-zinc-200/50 dark:bg-white/10 backdrop-blur-sm -rotate-1 z-20 border-l border-r border-white/20 dark:border-white/5 opacity-60" />

          {/* Thumbnail Image */}
          <div className="relative aspect-video bg-zinc-100 dark:bg-black overflow-hidden">
            {sub.signedThumbnailUrl ? (
              <Image
                src={sub.signedThumbnailUrl}
                alt={sub.versionTitle || "Project"}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                <LayoutGrid className="w-6 h-6 text-zinc-300 dark:text-zinc-800" />
              </div>
            )}

            {/* Version Badge */}
            <div className="absolute top-3 left-3 -rotate-3 group-hover:rotate-0 transition-transform">
              <Badge className="bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black/80 text-foreground dark:text-white border-zinc-200 dark:border-white/10 backdrop-blur font-mono text-[8px] px-1 h-4 shadow-sm">
                {sub.version.startsWith("v") ? sub.version : `v${sub.version}`}
              </Badge>
            </div>

            {/* Corner Indicators */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
              {hasAi && <Zap className="w-3 h-3 text-violet-500 dark:text-violet-400 fill-violet-500 dark:fill-violet-400 drop-shadow-lg" />}
              {feedbackCount > 0 && <MessageCircleHeart className="w-3 h-3 text-blue-500 dark:text-blue-400 drop-shadow-lg" />}
            </div>
          </div>

          {/* Card Info */}
          <div className="px-2.5 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm relative">
            <h3 className="font-bold text-[11px] text-foreground dark:text-zinc-100 leading-tight line-clamp-1 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors mb-0.5">
              {sub.versionTitle || sub.video?.title || sub.assignment?.request?.title || "제목 없는 프로젝트"}
            </h3>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground dark:text-zinc-500 font-medium">
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(sub.createdAt)}
              </span>
              <span>{sub.duration ? formatDuration(sub.duration) : "-"}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function StarDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-submissions-creative"],
    queryFn: fetchSubmissions,
  });

  const submissions = data?.data;
  const totalCount = data?.total ?? 0;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-background text-foreground dark:bg-black dark:text-white selection:bg-violet-500/30 -m-6 p-6 transition-colors duration-500">

      {/* 1. Background Typography (The "Mega Counter") */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="relative text-center leading-none flex flex-col items-center justify-center"
        >
          <h1 className="text-[25vw] md:text-[35vw] font-black text-zinc-100 dark:text-zinc-900 tracking-tighter mix-blend-difference opacity-40 dark:opacity-20 transition-colors duration-500">
            {totalCount}
          </h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[10vw] text-[2vw] font-bold text-zinc-300 dark:text-zinc-800 tracking-[1em] uppercase blur-[0.5px] transition-colors duration-500">
            전체 제작물
          </div>
        </motion.div>

        {/* Dynamic Gradients */}
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-violet-500/5 dark:bg-violet-900/10 rounded-full blur-[100px] animate-pulse-slow transition-colors duration-500" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-500/5 dark:bg-indigo-900/10 rounded-full blur-[100px] animate-pulse-slow delay-1000 transition-colors duration-500" />
      </div>

      {/* 2. Header Layer */}
      <div className="relative z-10 flex flex-col gap-2 mb-10 pointer-events-none">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-2 text-violet-500 font-bold uppercase tracking-widest text-xs"
        >
          <Layers className="w-4 h-4" />
          <span>크리에이티브 대시보드</span>
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground dark:text-white drop-shadow-2xl">
          마이 스튜디오<span className="text-violet-600">.</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-md backdrop-blur-sm">
          작품을 드래그하여 당신만의 아카이브를 자유롭게 탐색해보세요.
        </p>
      </div>

      {/* 3. The "Scattered Archive" Area */}
      <div className="relative z-10 w-full min-h-[60vh] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-64 h-48 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-border dark:border-white/5" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center items-center content-center w-full max-w-[1600px] mx-auto gap-4 p-10">
            {/* 
                    Using Flex Wrap + negative margins + transforms creates the "Pile" effect
                    while keeping it somewhat responsive and manageable.
                 */}
            {submissions?.map((sub, idx) => (
              <div key={sub.id} className="-m-4 md:-m-6 hover:z-50 transition-all duration-300">
                <DraggableCard sub={sub} index={idx} />
              </div>
            ))}

            {submissions?.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">아직 제작된 작품이 없습니다.</p>
                <Button variant="outline" className="mt-4">새 프로젝트 시작하기</Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
