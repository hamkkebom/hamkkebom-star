"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Eye,
  MessageSquare,
  Heart,
  User,
  Bookmark,
  Moon,
  Music,
  ChevronLeft,
  ChevronRight,
  Film,
  Tv,
  Monitor,
  Camera,
  Gamepad,
  Briefcase,
  Star,
  Sparkles,
  Zap,
  Flame,
  Coffee,
  Compass,
  Map,
  Book,
  PenTool,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

/* ─────────────── Types ─────────────── */

type ChartVideo = {
  id: string;
  title: string;
  signedThumbnailUrl: string | null;
  viewCount: number;
  owner: { name: string; chineseName: string | null };
};

type StarItem = {
  id: string;
  name: string;
  chineseName: string | null;
  videoCount: number;
};

type CommunityPost = {
  id: string;
  boardType: string;
  title: string;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  _count: { comments: number; likes: number };
};

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count?: { videos: number };
};

/* ─────────────── Utilities ─────────────── */

function formatViews(n: number) {
  if (n >= 10000) return (n / 10000).toFixed(1) + "만";
  if (n >= 1000) return (n / 1000).toFixed(1) + "천";
  return n.toLocaleString();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

/* ─────────────── Category Icon Map ─────────────── */

const iconMap: Record<string, React.ElementType> = {
  film: Film, music: Music, tv: Tv, monitor: Monitor, camera: Camera,
  gamepad: Gamepad, briefcase: Briefcase, heart: Heart, star: Star,
  sparkles: Sparkles, zap: Zap, flame: Flame, coffee: Coffee,
  compass: Compass, map: Map, book: Book, pentool: PenTool,
  chat: MessageSquare, favorite: Heart, person: User,
  bookmark: Bookmark, bedtime: Moon, music_note: Music,
};

const GLOW_COLORS = [
  { glow: "glow-blue", border: "border-blue-500/80", text: "text-blue-400" },
  { glow: "glow-purple", border: "border-purple-500/80", text: "text-purple-400" },
  { glow: "glow-red", border: "border-red-500/80", text: "text-red-400" },
  { glow: "glow-green", border: "border-green-500/80", text: "text-green-400" },
  { glow: "glow-cyan", border: "border-cyan-500/80", text: "text-cyan-400" },
  { glow: "glow-purple", border: "border-purple-500/80", text: "text-purple-400" },
];

const CREATOR_BORDER_COLORS = [
  "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]",
  "border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
  "border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]",
  "border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]",
  "border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]",
  "border-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.5)]",
];

const SCRAP_BADGE_COLORS = [
  "border-cyan-500/80 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] group-hover:bg-cyan-950",
  "border-purple-500/80 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] group-hover:bg-purple-950",
  "border-blue-500/80 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] group-hover:bg-blue-950",
];

export function HomeDashboard() {
  /* ─── Data Fetching ─── */

  // 히어로 배너 (인기 영상 5개)
  const { data: heroVideos = [] } = useQuery<ChartVideo[]>({
    queryKey: ["hero-videos"],
    queryFn: async () => {
      const res = await fetch("/api/videos?sort=popular&pageSize=5");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 인기 크리에이터
  const { data: stars = [] } = useQuery<StarItem[]>({
    queryKey: ["popular-stars"],
    queryFn: async () => {
      const res = await fetch("/api/videos/owners");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).slice(0, 12);
    },
    staleTime: 5 * 60 * 1000,
  });

  // 주간 차트 (인기 영상 10개)
  const { data: chartVideos = [] } = useQuery<ChartVideo[]>({
    queryKey: ["weekly-chart"],
    queryFn: async () => {
      const res = await fetch("/api/videos?sort=popular&pageSize=10");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 카테고리
  const { data: categoryData } = useQuery<{ data: CategoryItem[] }>({
    queryKey: ["categories-showcase"],
    queryFn: () => fetch("/api/categories").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoryData?.data?.slice(0, 6) || [];

  // 커뮤니티 게시물
  const { data: communityPosts = [] } = useQuery<CommunityPost[]>({
    queryKey: ["community-preview-home"],
    queryFn: async () => {
      const res = await fetch("/api/board/posts?pageSize=5&sort=popular");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []) as CommunityPost[];
    },
    staleTime: 2 * 60 * 1000,
  });

  /* ─── Hero Banner Auto-slide ─── */
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (heroVideos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % heroVideos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroVideos.length]);

  const prev = useCallback(() => setCurrent((p) => (p - 1 + heroVideos.length) % heroVideos.length), [heroVideos.length]);
  const next = useCallback(() => setCurrent((p) => (p + 1) % heroVideos.length), [heroVideos.length]);

  const top3 = chartVideos.slice(0, 3);
  const rest = chartVideos.slice(3, 10);

  return (
    <main className="max-w-7xl mx-auto overflow-hidden pb-10">
      {/* ═══════ Hero Banner ═══════ */}
      <section className="px-6 mb-12 relative mt-4">
        <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-gray-800">
          {heroVideos.length > 0 ? (
            <>
              <Link href={`/videos/${heroVideos[current]?.id}`}>
                {heroVideos[current]?.signedThumbnailUrl ? (
                  <img
                    alt={heroVideos[current]?.title}
                    className="w-full h-full object-cover opacity-80 transition-opacity duration-500"
                    src={heroVideos[current].signedThumbnailUrl!}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900/80 via-indigo-900/60 to-slate-900 flex items-center justify-center">
                    <Play className="w-20 h-20 text-white/20" />
                  </div>
                )}
              </Link>
              <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black/80 to-transparent">
                <div className="max-w-md backdrop-blur-md bg-white/5 p-6 rounded-xl border border-white/20 shadow-lg">
                  <p className="text-sm font-medium text-gray-300 mb-1">
                    {heroVideos[current]?.owner.chineseName || heroVideos[current]?.owner.name}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 line-clamp-2">
                    {heroVideos[current]?.title}
                  </h2>
                  <Link
                    href={`/videos/${heroVideos[current]?.id}`}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-full inline-flex items-center space-x-2 transition-transform transform hover:scale-105 border border-white/30 backdrop-blur-md"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    <span>PLAY</span>
                  </Link>
                </div>
              </div>
              {/* Navigation Buttons */}
              {heroVideos.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 backdrop-blur-sm hidden sm:block">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 backdrop-blur-sm hidden sm:block">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/80 via-indigo-900/60 to-slate-900 flex items-center justify-center animate-pulse">
              <Play className="w-20 h-20 text-white/10" />
            </div>
          )}
        </div>
        {/* Pagination Dots */}
        {heroVideos.length > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            {heroVideos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-4" : "bg-gray-600"}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══════ Popular Creators ═══════ */}
      <section className="mb-12 px-6">
        <h3 className="text-xl font-bold mb-6 text-gray-200">인기 크리에이터</h3>
        <div className="flex space-x-4 overflow-x-auto hide-scrollbar pb-4">
          {stars.length > 0
            ? stars.map((star, i) => {
                const displayName = star.chineseName || star.name;
                const colorClass = CREATOR_BORDER_COLORS[i % CREATOR_BORDER_COLORS.length];
                return (
                  <Link
                    key={star.id}
                    href={`/stars/profile/${star.id}`}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                  >
                    <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-gray-800 text-2xl font-bold mb-2 transition-transform group-hover:scale-105 ${colorClass}`}>
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors truncate max-w-[64px]">
                      {displayName}
                    </span>
                  </Link>
                );
              })
            : Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center flex-shrink-0 gap-2">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="w-12 h-3" />
                </div>
              ))}
        </div>
      </section>

      {/* ═══════ Weekly Chart ═══════ */}
      <section className="mb-12 px-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">주간 토크 차트</h3>
          <Link href="/videos?sort=popular" className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            전체 보기
          </Link>
        </div>

        {/* Top 3 Large Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {top3.length > 0
            ? top3.map((v, i) => (
                <Link key={v.id} href={`/videos/${v.id}`} className="relative rounded-xl overflow-hidden aspect-video bg-gray-800 group cursor-pointer block">
                  {v.signedThumbnailUrl ? (
                    <img alt={v.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300" src={v.signedThumbnailUrl} />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-indigo-900/30 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 p-4 bg-gradient-to-t from-black/90 to-transparent w-full transition-transform transform group-hover:translate-y-[-4px]">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-black neon-text">{i + 1}</span>
                      <div>
                        <h4 className="font-bold text-sm line-clamp-1">{v.title}</h4>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {formatViews(v.viewCount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            : Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
        </div>

        {/* Rank List 4-10 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {rest.map((v, i) => (
            <Link
              key={v.id}
              href={`/videos/${v.id}`}
              className="group flex items-center gap-4 py-2 border-b border-gray-800 hover:bg-gray-800/50 rounded-lg px-2 transition-colors cursor-pointer"
            >
              <span className={`text-2xl font-black text-transparent bg-clip-text w-6 text-center ${i + 4 <= 7 ? "bg-gradient-to-b from-blue-400 to-purple-500" : "bg-gradient-to-b from-purple-400 to-pink-500"}`}>
                {i + 4}
              </span>
              <div className="relative w-20 h-12 rounded bg-gray-700 overflow-hidden flex-shrink-0">
                {v.signedThumbnailUrl ? (
                  <img alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={v.signedThumbnailUrl} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-900/30 to-indigo-900/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">{v.title}</h5>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span>{v.owner.chineseName || v.owner.name}</span>
                  <span>·</span>
                  <Eye className="w-3 h-3" /> {formatViews(v.viewCount)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════ Categories ═══════ */}
      <section className="mb-12 px-6">
        <h3 className="text-xl font-bold mb-6">카테고리</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.length > 0
            ? categories.map((cat, i) => {
                const iconKey = cat.icon?.toLowerCase() || "film";
                const Icon = iconMap[iconKey] || Film;
                const color = GLOW_COLORS[i % GLOW_COLORS.length];
                return (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className={`aspect-square rounded-xl border-2 bg-gray-900/50 flex flex-col items-center justify-center p-2 transition-transform hover:-translate-y-1 group ${color.glow} ${color.border}`}
                  >
                    <Icon className={`mb-2 w-8 h-8 group-hover:scale-110 transition-transform ${color.text}`} />
                    <span className={`font-bold text-sm text-center ${color.text}`}>{cat.name}</span>
                    {cat._count?.videos !== undefined && (
                      <span className="text-[10px] text-gray-500 mt-1">{cat._count.videos}개</span>
                    )}
                  </Link>
                );
              })
            : Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
        </div>
      </section>

      {/* ═══════ Community Board ═══════ */}
      <section className="px-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">커뮤니티</h3>
          <Link href="/community" className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            전체 보기
          </Link>
        </div>
        <div className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors duration-300">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-xl"></div>
          <div className="flex justify-between items-center px-4 py-3 bg-gray-800/80 border-b border-gray-700 text-xs text-gray-400 font-medium">
            <div className="flex-1">게시물</div>
            <div className="w-16 text-center">조회수</div>
            <div className="w-20 text-center">반응</div>
          </div>

          <div className="divide-y divide-gray-700/50">
            {communityPosts.length > 0
              ? communityPosts.map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/community/${post.id}`}
                    className="flex justify-between items-center px-4 py-3 hover:bg-gray-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 pr-4">
                      <h4 className="text-sm font-medium text-gray-200 mb-1 group-hover:text-white transition-colors line-clamp-1">
                        {post.title}
                      </h4>
                      <p className="text-[10px] text-gray-500">
                        {timeAgo(post.createdAt)} | 댓글 {post._count.comments}개
                      </p>
                    </div>
                    <div className="w-16 text-center text-xs text-gray-400">
                      {formatViews(post.viewCount)}
                    </div>
                    <div className="w-20 flex justify-center">
                      <span className={`px-3 py-1 rounded-full border bg-gray-900 text-[10px] transition-colors ${SCRAP_BADGE_COLORS[i % SCRAP_BADGE_COLORS.length]}`}>
                        ♥ {post._count.likes}
                      </span>
                    </div>
                  </Link>
                ))
              : Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center px-4 py-3 gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <Link href="/community" className="px-6 py-2 rounded-full border border-gray-600 hover:border-gray-400 hover:text-white text-sm text-gray-300 transition-colors">
            더보기
          </Link>
        </div>
      </section>
    </main>
  );
}
