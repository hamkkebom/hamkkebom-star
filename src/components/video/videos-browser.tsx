"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Film,
  Play,
  Eye,
  Clock,
  SlidersHorizontal,
  Flame,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ───── Types ───── */
type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  _count: { videos: number };
};

type OwnerRow = {
  id: string;
  name: string;
  chineseName: string | null;
  videoCount: number;
};

type CounselorRow = {
  id: string;
  displayName: string;
  imageUrl: string | null;
  videoCount: number;
};

type VideoRow = {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string | null;
  signedThumbnailUrl?: string | null;
  streamUid: string;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
  };
  category: { id: string; name: string; slug: string } | null;
  counselor: { id: string; displayName: string } | null;
  technicalSpec: { duration: number | null } | null;
  viewCount: number;
  _count: { eventLogs: number };
};

type VideosResponse = {
  data: VideoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type DurationRange = "all" | "short" | "medium" | "long";

const DURATION_RANGES: Record<
  DurationRange,
  { label: string; min?: number; max?: number }
> = {
  all: { label: "전체 길이" },
  short: { label: "~20초", max: 20 },
  medium: { label: "~40초", min: 20, max: 40 },
  long: { label: "~1분", min: 40, max: 60 },
};

/* ───── Helpers ───── */
function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getThumbUrl(video: VideoRow): string | null {
  if (video.signedThumbnailUrl) return video.signedThumbnailUrl;
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.streamUid)
    return `https://videodelivery.net/${video.streamUid}/thumbnails/thumbnail.jpg?width=1280&height=720&fit=crop`;
  return null;
}

/* ───── HeroSection ───── */
function HeroSection({ video }: { video: VideoRow }) {
  const thumb = getThumbUrl(video);
  return (
    <Link
      href={`/videos/${video.id}`}
      className="block relative w-full group overflow-hidden bg-black"
    >
      <div className="relative w-full aspect-video sm:aspect-[21/9]">
        {thumb ? (
          <Image
            src={thumb}
            alt={video.title}
            fill
            unoptimized
            priority
            sizes="100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent hidden sm:block" />
        <div className="absolute inset-0 flex items-end sm:items-center p-5 sm:p-10 md:p-14">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-300 bg-violet-500/25 border border-violet-500/40 rounded-full px-3 py-1 backdrop-blur-sm">
                <Sparkles className="w-3 h-3" /> 추천 영상
              </span>
              {video.category && (
                <span className="text-[11px] font-medium text-white/80 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
                  {video.category.name}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-white leading-tight line-clamp-2 drop-shadow-lg mb-3 sm:mb-4">
              {video.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-white/70 mb-4 sm:mb-6">
              <span className="font-semibold text-white/90">
                {video.owner.chineseName || video.owner.name}
              </span>
              {video.technicalSpec?.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDuration(video.technicalSpec.duration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {video.viewCount.toLocaleString()}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 group-hover:bg-violet-400 group-hover:text-white shadow-xl shadow-black/30">
              <Play className="w-4 h-4 fill-current" /> 영상 보기
            </div>
          </div>
        </div>
        {/* Mobile center play */}
        <div className="absolute inset-0 flex items-center justify-center sm:hidden pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-80">
            <Play className="w-6 h-6 text-white fill-current ml-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ───── CategoryChips ───── */
function CategoryChips({
  categories,
  activeId,
  onChange,
}: {
  categories: CategoryRow[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, categories]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const active = el.querySelector(
      "[data-active='true']",
    ) as HTMLElement | null;
    if (active)
      active.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }, [activeId]);

  const scrollBy = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex items-center">
      {canScrollLeft && (
        <button
          onClick={() => scrollBy("left")}
          className="hidden md:flex absolute left-0 z-10 w-8 h-8 items-center justify-center rounded-full bg-background/95 border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden px-1 md:px-10"
        style={{ scrollBehavior: "smooth" }}
      >
        <button
          data-active={!activeId}
          onClick={() => onChange(null)}
          className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${!activeId ? "bg-foreground text-background shadow-sm" : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            data-active={activeId === cat.id}
            onClick={() => onChange(activeId === cat.id ? null : cat.id)}
            className={`whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeId === cat.id ? "bg-foreground text-background shadow-sm" : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {cat.name}
            {cat._count.videos > 0 && (
              <span
                className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none ${activeId === cat.id ? "bg-white/20 text-white" : "bg-black/[0.08] dark:bg-white/[0.12] text-current"}`}
              >
                {cat._count.videos}
              </span>
            )}
          </button>
        ))}
      </div>
      {canScrollRight && (
        <button
          onClick={() => scrollBy("right")}
          className="hidden md:flex absolute right-0 z-10 w-8 h-8 items-center justify-center rounded-full bg-background/95 border border-border shadow-sm hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ───── Memoized Video Grid ───── */
const VideoGrid = memo(function VideoGrid({
  videos,
  page,
}: {
  videos: VideoRow[];
  page: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
      {videos.map((video, index) => {
        const useSigned = !!video.signedThumbnailUrl;
        return (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            thumbnailUrl={
              useSigned ? video.signedThumbnailUrl! : video.thumbnailUrl
            }
            streamUid={useSigned ? null : video.streamUid}
            duration={video.technicalSpec?.duration ?? null}
            ownerName={video.owner.chineseName || video.owner.name}
            categoryName={video.category?.name ?? null}
            createdAt={video.createdAt}
            viewCount={video.viewCount}
            priority={page === 1 && index < 6}
          />
        );
      })}
    </div>
  );
});

/* ───── Skeletons ───── */
function HeroSkeleton() {
  return (
    <Skeleton className="w-full aspect-video sm:aspect-[21/9] rounded-none" />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

/* ───── Main Component ───── */
export function VideosBrowser() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    ownerId: null as string | null,
    counselorId: null as string | null,
    durationRange: "all" as DurationRange,
    sort: "latest" as "latest" | "oldest",
  });

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get("page")) || 1;
  const categoryId = searchParams.get("categoryId") || null;
  const ownerId = searchParams.get("ownerId") || null;
  const counselorId = searchParams.get("counselorId") || null;
  const durationRange: DurationRange =
    (searchParams.get("duration") as DurationRange) || "all";
  const sort: "latest" | "oldest" =
    (searchParams.get("sort") as "latest" | "oldest") || "latest";

  /* ── URL updaters ── */
  const setPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const setCategoryId = useCallback(
    (v: string | null) => updateFilter("categoryId", v),
    [updateFilter],
  );

  const setSort = useCallback(
    (v: "latest" | "oldest") =>
      updateFilter("sort", v === "latest" ? null : v),
    [updateFilter],
  );

  /* ── Data fetching ── */
  const queryClient = useQueryClient();

  const { data: filtersData } = useQuery<{
    data: {
      categories: CategoryRow[];
      owners: OwnerRow[];
      counselors: CounselorRow[];
    };
  }>({
    queryKey: ["video-filters"],
    queryFn: () => fetch("/api/videos/filters").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const categories = filtersData?.data?.categories ?? [];
  const owners = filtersData?.data?.owners ?? [];
  const counselors = filtersData?.data?.counselors ?? [];

  const buildEndpoint = useCallback(
    (overridePage?: number) => {
      const params = new URLSearchParams();
      params.set("page", String(overridePage ?? page));
      params.set("pageSize", "20");
      params.set("sort", sort);
      if (categoryId) params.set("categoryId", categoryId);
      if (ownerId) params.set("ownerId", ownerId);
      if (counselorId) params.set("counselorId", counselorId);
      if (durationRange !== "all") {
        const range = DURATION_RANGES[durationRange];
        if (range.min !== undefined)
          params.set("durationMin", String(range.min));
        if (range.max !== undefined)
          params.set("durationMax", String(range.max));
      }
      if (activeSearch.trim()) {
        params.set("q", activeSearch.trim());
        return `/api/videos/search?${params.toString()}`;
      }
      return `/api/videos?${params.toString()}`;
    },
    [page, sort, categoryId, ownerId, counselorId, durationRange, activeSearch],
  );

  const { data: videosData, isLoading } = useQuery<VideosResponse>({
    queryKey: [
      "videos-browse",
      activeSearch,
      page,
      categoryId,
      ownerId,
      counselorId,
      durationRange,
      sort,
    ],
    queryFn: async () => {
      const res = await fetch(buildEndpoint());
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return res.json() as Promise<VideosResponse>;
    },
    staleTime: 60_000,
  });

  // Prefetch next page
  useEffect(() => {
    if (videosData && page < videosData.totalPages) {
      queryClient.prefetchQuery({
        queryKey: [
          "videos-browse",
          activeSearch,
          page + 1,
          categoryId,
          ownerId,
          counselorId,
          durationRange,
          sort,
        ],
        queryFn: () =>
          fetch(buildEndpoint(page + 1)).then((r) => r.json()),
        staleTime: 60_000,
      });
    }
  }, [
    videosData,
    page,
    activeSearch,
    categoryId,
    ownerId,
    counselorId,
    durationRange,
    sort,
    queryClient,
    buildEndpoint,
  ]);

  /* ── Derived values ── */
  const hasActiveFilter = !!(
    categoryId ||
    ownerId ||
    counselorId ||
    durationRange !== "all" ||
    activeSearch
  );
  const videos = videosData?.data ?? [];
  const advancedFilterCount =
    (ownerId ? 1 : 0) +
    (counselorId ? 1 : 0) +
    (durationRange !== "all" ? 1 : 0) +
    (sort !== "latest" ? 1 : 0);
  const showHero =
    page === 1 &&
    !activeSearch &&
    !ownerId &&
    !counselorId &&
    durationRange === "all";
  const heroVideo =
    showHero && !isLoading && videos.length > 0 ? videos[0] : null;
  const gridVideos = heroVideo ? videos.slice(1) : videos;
  const activeCategoryName = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? null)
    : null;

  /* ── Handlers ── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    setActiveSearch("");
    setSearch("");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* ═══ Sticky Header ═══ */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 py-3 space-y-3">
          {/* Row 1: Search + Sort + Filter */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-2xl">
              <div className="relative flex items-center">
                <Search
                  className={`absolute left-3.5 w-4 h-4 transition-colors pointer-events-none ${isSearchFocused ? "text-foreground" : "text-muted-foreground"}`}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="영상 검색..."
                  className="w-full h-10 pl-10 pr-9 bg-muted/60 dark:bg-muted/40 border border-transparent focus:border-border/80 focus:bg-background rounded-full text-sm placeholder:text-muted-foreground/60 focus:outline-none transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveSearch("");
                    }}
                    className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Sort (desktop) */}
            <div className="hidden sm:flex items-center gap-0.5 p-1 bg-muted/50 rounded-full shrink-0">
              <button
                onClick={() => setSort("latest")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sort === "latest" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Flame className="w-3.5 h-3.5" /> 최신
              </button>
              <button
                onClick={() => setSort("oldest")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${sort === "oldest" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Clock className="w-3.5 h-3.5" /> 오래된순
              </button>
            </div>

            {/* Filter Sheet */}
            <Sheet
              open={isMobileFilterOpen}
              onOpenChange={(open) => {
                setIsMobileFilterOpen(open);
                if (open)
                  setTempFilters({
                    ownerId,
                    counselorId,
                    durationRange,
                    sort,
                  });
              }}
            >
              <SheetTrigger asChild>
                <button
                  className={`relative flex shrink-0 items-center gap-2 h-10 px-3.5 sm:px-4 rounded-full border text-sm font-semibold transition-all ${advancedFilterCount > 0 ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">필터</span>
                  {advancedFilterCount > 0 && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                      {advancedFilterCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="h-[80vh] rounded-t-3xl px-0 pb-0 flex flex-col"
              >
                <SheetHeader className="px-6 pb-4 border-b">
                  <SheetTitle className="text-left">고급 필터</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
                  {/* Sort */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-foreground">
                      정렬
                    </h4>
                    <div className="flex gap-2">
                      {(["latest", "oldest"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            setTempFilters((p) => ({ ...p, sort: s }))
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tempFilters.sort === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {s === "latest" ? "최신순" : "오래된순"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-foreground">
                      영상 길이
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(
                        Object.entries(DURATION_RANGES) as [
                          DurationRange,
                          { label: string },
                        ][]
                      ).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() =>
                            setTempFilters((p) => ({
                              ...p,
                              durationRange: key,
                            }))
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tempFilters.durationRange === key ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {val.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Owner */}
                  {owners.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-foreground">
                        제작자
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setTempFilters((p) => ({ ...p, ownerId: null }))
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!tempFilters.ownerId ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          전체
                        </button>
                        {owners.map((o) => (
                          <button
                            key={o.id}
                            onClick={() =>
                              setTempFilters((p) => ({ ...p, ownerId: o.id }))
                            }
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tempFilters.ownerId === o.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            {o.chineseName || o.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Counselor */}
                  {counselors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-foreground">
                        상담사
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            setTempFilters((p) => ({
                              ...p,
                              counselorId: null,
                            }))
                          }
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!tempFilters.counselorId ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          전체
                        </button>
                        {counselors.map((c) => (
                          <button
                            key={c.id}
                            onClick={() =>
                              setTempFilters((p) => ({
                                ...p,
                                counselorId: c.id,
                              }))
                            }
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tempFilters.counselorId === c.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            {c.displayName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sheet footer */}
                <div className="p-4 border-t flex gap-3 bg-background">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() =>
                      setTempFilters({
                        ownerId: null,
                        counselorId: null,
                        durationRange: "all",
                        sort: "latest",
                      })
                    }
                  >
                    초기화
                  </Button>
                  <Button
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => {
                      const params = new URLSearchParams(
                        searchParams.toString(),
                      );
                      if (tempFilters.ownerId)
                        params.set("ownerId", tempFilters.ownerId);
                      else params.delete("ownerId");
                      if (tempFilters.counselorId)
                        params.set("counselorId", tempFilters.counselorId);
                      else params.delete("counselorId");
                      if (tempFilters.durationRange !== "all")
                        params.set("duration", tempFilters.durationRange);
                      else params.delete("duration");
                      if (tempFilters.sort !== "latest")
                        params.set("sort", tempFilters.sort);
                      else params.delete("sort");
                      params.set("page", "1");
                      router.push(`${pathname}?${params.toString()}`, {
                        scroll: false,
                      });
                      setIsMobileFilterOpen(false);
                    }}
                  >
                    적용하기
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* Reset (desktop) */}
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="hidden sm:flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" /> 초기화
              </button>
            )}
          </div>

          {/* Row 2: Category chips */}
          {categories.length > 0 && (
            <CategoryChips
              categories={categories}
              activeId={categoryId}
              onChange={setCategoryId}
            />
          )}
        </div>
      </div>

      {/* ═══ Hero ═══ */}
      {isLoading && page === 1 && !activeSearch ? (
        <HeroSkeleton />
      ) : heroVideo ? (
        <HeroSection video={heroVideo} />
      ) : null}

      {/* ═══ Grid ═══ */}
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 pt-6 sm:pt-8">
        {(activeSearch || activeCategoryName || !isLoading) && (
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {activeCategoryName ??
                  (activeSearch
                    ? `"${activeSearch}" 검색결과`
                    : "전체 영상")}
              </h2>
              {videosData && !isLoading && (
                <span className="text-sm text-muted-foreground font-normal">
                  {videosData.total.toLocaleString()}개
                </span>
              )}
            </div>
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="sm:hidden flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" /> 초기화
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <GridSkeleton />
        ) : !videos.length ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-28 rounded-2xl border border-dashed text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {hasActiveFilter
                ? "조건에 맞는 영상이 없습니다"
                : "영상이 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              {hasActiveFilter
                ? "다른 검색어나 필터를 사용해 보세요."
                : "아직 공개된 영상이 없습니다."}
            </p>
            {hasActiveFilter && (
              <Button
                onClick={resetFilters}
                size="sm"
                className="rounded-full px-5"
              >
                전체 보기
              </Button>
            )}
          </div>
        ) : (
          <VideoGrid videos={gridVideos} page={page} />
        )}

        {/* ═══ Pagination ═══ */}
        {videosData && videosData.totalPages > 1 && (
          <div className="mt-10 sm:mt-14 flex justify-center items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setPage(page - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-full px-5 h-10 font-semibold"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> 이전
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({
                length: Math.min(videosData.totalPages, 5),
              }).map((_, i) => {
                let pageNum: number;
                if (videosData.totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= videosData.totalPages - 2)
                  pageNum = videosData.totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setPage(pageNum);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`h-10 min-w-[40px] rounded-full px-3 text-sm font-bold transition-all ${pageNum === page ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= videosData.totalPages}
              onClick={() => {
                setPage(page + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-full px-5 h-10 font-semibold"
            >
              다음 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
