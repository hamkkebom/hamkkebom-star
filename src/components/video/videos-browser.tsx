"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronDown,
  X,
  Film,
  ChevronLeft,
  ChevronRight,
  Play,
  Home,
  LayoutGrid,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { Button } from "@/components/ui/button";

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
  owner: { id: string; name: string; chineseName: string | null; email: string };
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

const DURATION_RANGES: Record<DurationRange, { label: string; min?: number; max?: number }> = {
  all: { label: "전체" },
  short: { label: "~20초", max: 20 },
  medium: { label: "~40초", min: 20, max: 40 },
  long: { label: "~1분", min: 40, max: 60 },
};

/* ───── Dropdown Component ───── */
/* ───── Dropdown Component ───── */
function FilterDropdown({
  label,
  icon: Icon,
  isActive,
  children,
  onClear,
  align = "right", // align prop added for better positioning
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  children: React.ReactNode;
  onClear?: () => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    // Add scroll listener to close on outside scroll
    function handleScroll(e: Event) {
      // If the scroll happened inside the dropdown, don't close it
      if (ref.current && ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", handleScroll, { capture: true });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    }
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all duration-300
          ${isActive
            ? "border-black bg-black text-white hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            : "border-border bg-background text-foreground hover:border-foreground/50 hover:bg-accent/50"
          }`}
      >
        <span className={isActive ? "opacity-100" : "opacity-50 group-hover:opacity-100 transition-opacity"}>
          <Icon className="w-4 h-4" />
        </span>
        <span>{label}</span>
        {isActive && onClear ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} z-50 mt-2 min-w-[320px] max-h-[400px] overflow-y-auto rounded-2xl border border-black/5 bg-background/95 backdrop-blur-xl p-3 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-black/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          dark:[&::-webkit-scrollbar-thumb]:bg-white/10
          hover:[&::-webkit-scrollbar-thumb]:bg-black/20
          dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-left transition-all duration-200
        ${active
          ? "bg-black/5 text-black dark:bg-white/10 dark:text-white font-semibold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
    >
      <div className="flex items-center gap-2">
        {active && <div className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />}
        <span className={active ? "" : "pl-3.5"}>{children}</span>
      </div>
      {count !== undefined && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${active ? "bg-black/10 text-black dark:bg-white/20 dark:text-white" : "bg-muted text-muted-foreground group-hover:bg-black/5 group-hover:text-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}


/* ───── SwimlaneRow Component ───── */
function SwimlaneRow({ title, videos, page }: { title: string; videos: VideoRow[], page: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!videos.length) return null;

  return (
    <div className="relative group w-full pt-2 pb-6 overflow-visible">
      <h3 className="px-4 sm:px-6 lg:px-8 xl:px-[calc((100vw-1920px)/2+2rem)] text-lg sm:text-2xl font-bold mb-4 drop-shadow-md text-foreground dark:text-white">
        {title}
      </h3>

      {/* Scroll Arrows */}
      <div className={`absolute left-0 top-14 bottom-14 w-12 sm:w-24 z-20 bg-gradient-to-r from-background via-background/80 dark:from-[#050505] dark:via-[#050505]/80 to-transparent pointer-events-none flex items-center shrink-0 transition-opacity duration-300 ${showLeft ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => scroll("left")} className="pointer-events-auto w-10 h-10 sm:w-14 sm:h-14 ml-1 sm:ml-4 rounded-full bg-white/80 dark:bg-black/80 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:scale-110 text-black dark:text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 -ml-1" />
        </button>
      </div>

      <div className={`absolute right-0 top-14 bottom-14 w-16 sm:w-32 z-20 bg-gradient-to-l from-background via-background/80 dark:from-[#050505] dark:via-[#050505]/80 to-transparent pointer-events-none flex items-center justify-end shrink-0 transition-opacity duration-300 ${showRight ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => scroll("right")} className="pointer-events-auto w-10 h-10 sm:w-14 sm:h-14 mr-1 sm:mr-4 rounded-full bg-white/80 dark:bg-black/80 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black hover:scale-110 text-black dark:text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md dark:shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 ml-1" />
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 sm:gap-5 overflow-x-auto overflow-y-visible pb-12 pt-4 scrollbar-none [&::-webkit-scrollbar]:hidden snap-x snap-mandatory px-4 sm:px-6 lg:px-8 xl:px-[calc((100vw-1920px)/2+2rem)] w-full"
      >
        {videos.map((video, idx) => {
          const useSigned = !!video.signedThumbnailUrl;
          return (
            <div key={video.id} className="w-[75vw] sm:w-[300px] lg:w-[380px] xl:w-[420px] flex-shrink-0 snap-start">
              <VideoCard
                id={video.id}
                title={video.title}
                thumbnailUrl={useSigned ? video.signedThumbnailUrl! : video.thumbnailUrl}
                streamUid={useSigned ? null : video.streamUid}
                duration={video.technicalSpec?.duration ?? null}
                ownerName={video.owner.chineseName || video.owner.name}
                categoryName={video.category?.name ?? null}
                createdAt={video.createdAt}
                viewCount={video.viewCount}
                priority={page === 1 && idx < 4}
                compact={true}
              />
            </div>
          )
        })}
      </div>
    </div>
  );
}


/* ───── Main Component ───── */
export function VideosBrowser() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL ?page= 파라미터에서 페이지 직접 파생 (state 불필요)
  const page = Number(searchParams.get("page")) || 1;
  // viewMode도 URL에서 파생 — 뒤로가기 시 전체보기 상태가 유지됨
  const viewMode = (searchParams.get("view") === "grid" ? "grid" : "home") as "home" | "grid";

  const setViewMode = useCallback((mode: "home" | "grid") => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === "grid") {
      params.set("view", "grid");
    } else {
      params.delete("view");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [counselorId, setCounselorId] = useState<string | null>(null);
  const [durationRange, setDurationRange] = useState<DurationRange>("all");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");

  // ─── Data fetching: categories, owners, counselors ───
  const { data: categoriesData } = useQuery<{ data: CategoryRow[] }>({
    queryKey: ["video-categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: ownersData } = useQuery<{ data: OwnerRow[] }>({
    queryKey: ["video-owners"],
    queryFn: () => fetch("/api/videos/owners").then((r) => r.json()),
    staleTime: 60_000,
  });

  const { data: counselorsData } = useQuery<{ data: CounselorRow[] }>({
    queryKey: ["video-counselors"],
    queryFn: () => fetch("/api/videos/counselors").then((r) => r.json()),
    staleTime: 60_000,
  });

  const categories = categoriesData?.data ?? [];
  const owners = ownersData?.data ?? [];
  const counselors = counselorsData?.data ?? [];

  // ─── Build endpoint ───
  const buildEndpoint = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    params.set("sort", sort);
    if (categoryId) params.set("categoryId", categoryId);
    if (ownerId) params.set("ownerId", ownerId);
    if (counselorId) params.set("counselorId", counselorId);
    if (durationRange !== "all") {
      const range = DURATION_RANGES[durationRange];
      if (range.min !== undefined) params.set("durationMin", String(range.min));
      if (range.max !== undefined) params.set("durationMax", String(range.max));
    }

    if (activeSearch.trim()) {
      params.set("q", activeSearch.trim());
      return `/api/videos/search?${params.toString()}`;
    }
    return `/api/videos?${params.toString()}`;
  }, [page, sort, categoryId, ownerId, counselorId, durationRange, activeSearch]);

  const hasActiveFilter = categoryId || ownerId || counselorId || durationRange !== "all" || activeSearch;
  const showGrid = hasActiveFilter || viewMode === "grid";
  const isDefaultView = !showGrid;

  const { data: filteredData, isLoading: isFilteredLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse", activeSearch, page, categoryId, ownerId, counselorId, durationRange, sort],
    queryFn: async () => {
      const res = await fetch(buildEndpoint());
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    enabled: !isDefaultView,
    staleTime: 30_000,
  });

  const { data: latestData, isLoading: isLatestLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse-latest"],
    queryFn: async () => {
      const res = await fetch(`/api/videos?sort=latest&pageSize=20`);
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    enabled: isDefaultView,
    staleTime: 30_000,
  });

  const { data: popularData, isLoading: isPopularLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse-popular"],
    queryFn: async () => {
      const res = await fetch(`/api/videos?sort=popular&pageSize=20`);
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    enabled: isDefaultView,
    staleTime: 30_000,
  });

  const randomCategoryId = categories.length > 0 ? categories[0].id : "";
  const randomCategoryName = categories.length > 0 ? categories[0].name : "추천";

  const { data: catData, isLoading: isCatLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse-cat", randomCategoryId],
    queryFn: async () => {
      const res = await fetch(`/api/videos?sort=popular&categoryId=${randomCategoryId}&pageSize=20`);
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    enabled: isDefaultView && !!randomCategoryId,
    staleTime: 30_000,
  });

  const isLoading = isDefaultView ? (isLatestLoading || isPopularLoading) : isFilteredLoading;
  const displayData = isDefaultView ? latestData : filteredData;

  // ─── Handlers ───
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const resetFilters = (mode?: "home" | "grid") => {
    setCategoryId(null);
    setOwnerId(null);
    setCounselorId(null);
    setDurationRange("all");
    setActiveSearch("");
    setSearch("");
    setSort("latest");
    if (mode) {
      setViewMode(mode);
    } else {
      setPage(1);
    }
  };

  // ─── Labels for active state ───
  const catLabel = categoryId ? categories.find((c) => c.id === categoryId)?.name ?? "카테고리" : "카테고리";
  const ownerLabel = ownerId
    ? (() => { const o = owners.find((o) => o.id === ownerId); return o ? (o.chineseName || o.name) : "제작자"; })()
    : "제작자";
  const counselorLabel = counselorId
    ? counselors.find((c) => c.id === counselorId)?.displayName ?? "상담사"
    : "상담사";

  return (
    <div className="min-h-screen">
      {/* ═══ Premium Search & Filter Header ═══ */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 space-y-4">

          {/* 1. Floating Search Bar */}
          <div className="flex justify-center">
            <form onSubmit={handleSearch} className="relative w-full max-w-2xl group">
              <div className={`absolute inset-0 bg-black/5 rounded-full blur-xl transition-opacity duration-500 ${search ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <div className="relative flex items-center bg-background rounded-full shadow-lg border border-black/5 transaction-all duration-300 focus-within:ring-2 focus-within:ring-black/10 focus-within:border-black/20 dark:bg-zinc-900 dark:border-white/10 dark:focus-within:ring-white/20">
                <Search className="ml-5 w-5 h-5 text-muted-foreground" />
                <input
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="무엇을 찾고 계신가요?"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent border-none rounded-full px-4 py-3.5 text-base focus:outline-none placeholder:text-muted-foreground/70"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setActiveSearch(""); setPage(1); }}
                    className="mr-2 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 2. Filter Controls (Segmented & Dropdowns) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Left: Quick Filters (Segmented) */}
            <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
              <div className="flex p-1 bg-muted/50 rounded-full border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                <button
                  onClick={() => resetFilters("home")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${!showGrid
                      ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">홈</span>
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${showGrid
                      ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden sm:inline">전체보기</span>
                </button>
              </div>
              <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
              <div className="flex p-1 bg-muted/50 rounded-full border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                {(Object.entries(DURATION_RANGES) as [DurationRange, { label: string }][]).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => { setDurationRange(key); setPage(1); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${durationRange === key
                        ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border mx-2 hidden sm:block" />
              <div className="flex p-1 bg-muted/50 rounded-full border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                <button
                  onClick={() => { setSort("latest"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${sort === "latest"
                      ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => { setSort("oldest"); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${sort === "oldest"
                      ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  오래된순
                </button>
              </div>
            </div>

            {/* Right: Detailed Filters (Dropdowns) */}
            <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden w-full sm:w-auto justify-end">

              {/* Category Dropdown (Grid) */}
              <FilterDropdown label={catLabel} icon={Film} isActive={!!categoryId} onClear={() => { setCategoryId(null); setPage(1); }} align="right">
                <div className="w-[320px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!categoryId} onClick={() => { setCategoryId(null); setPage(1); }}>
                      전체 카테고리
                    </DropdownItem>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {categories.map((c) => (
                      <DropdownItem key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPage(1); }} count={c._count.videos}>
                        {c.name}
                      </DropdownItem>
                    ))}
                  </div>
                </div>
              </FilterDropdown>

              {/* Owner Dropdown (Grid) */}
              <FilterDropdown label={ownerLabel} icon={Film} isActive={!!ownerId} onClear={() => { setOwnerId(null); setPage(1); }} align="right">
                <div className="w-[320px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!ownerId} onClick={() => { setOwnerId(null); setPage(1); }}>
                      전체 제작자
                    </DropdownItem>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {owners.map((o) => (
                      <DropdownItem key={o.id} active={ownerId === o.id} onClick={() => { setOwnerId(o.id); setPage(1); }} count={o.videoCount}>
                        {o.chineseName || o.name}
                      </DropdownItem>
                    ))}
                  </div>
                </div>
              </FilterDropdown>

              {/* Counselor Dropdown (List - usually fewer items, but keeping consistent) */}
              <FilterDropdown label={counselorLabel} icon={Film} isActive={!!counselorId} onClear={() => { setCounselorId(null); setPage(1); }} align="right">
                <div className="w-[280px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!counselorId} onClick={() => { setCounselorId(null); setPage(1); }}>
                      전체 상담사
                    </DropdownItem>
                  </div>
                  <div className="space-y-1">
                    {counselors.map((c) => (
                      <DropdownItem key={c.id} active={counselorId === c.id} onClick={() => { setCounselorId(c.id); setPage(1); }} count={c.videoCount}>
                        {c.displayName}
                      </DropdownItem>
                    ))}
                  </div>
                </div>
              </FilterDropdown>

              {/* 필터 초기화 */}
              {hasActiveFilter && (
                <button
                  onClick={() => resetFilters("grid")}
                  className="flex items-center justify-center p-2 rounded-full border border-transparent hover:bg-destructive/10 text-destructive transition-colors"
                  title="필터 초기화"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ V6 Enterprise Cinematic Hero Section (Netflix/Disney+ Style) ═══ */}
      {/* 가장 최신 영상 1개를 히어로 배너로 사용 (데이터가 있을 때만) */}
      <div className="relative z-10 w-full pb-20 bg-background text-foreground transition-all duration-500">
        {displayData?.data && displayData.data.length > 0 && page === 1 && !showGrid ? (
          <div className="relative w-full h-[75vh] min-h-[500px] max-h-[850px] overflow-hidden bg-background dark:bg-[#050505] flex items-end">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
              style={{
                backgroundImage: `url(${displayData.data[0].signedThumbnailUrl || displayData.data[0].thumbnailUrl})`,
                maskImage: 'linear-gradient(to top, transparent 0%, black 30%, black 100%), linear-gradient(to right, black 50%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 30%, black 100%)'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

            <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 sm:px-8 pb-12 sm:pb-20">
              <div className="flex flex-col items-start gap-4 sm:gap-5 max-w-3xl p-6 sm:p-8 rounded-3xl bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
                <div>
                  <span className="inline-block bg-black/5 dark:bg-white/15 text-foreground dark:text-white border border-black/10 dark:border-white/20 px-4 py-1.5 font-bold text-xs sm:text-sm tracking-widest uppercase rounded-full">
                    {displayData.data[0].category?.name || "추천 영상"}
                  </span>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-foreground dark:text-white leading-[1.1] drop-shadow-lg dark:drop-shadow-2xl break-keep">
                    {displayData.data[0].title}
                  </h1>
                </div>
                <div>
                  <p className="text-foreground/80 dark:text-white/80 text-sm sm:text-lg font-medium flex items-center gap-3 drop-shadow-md">
                    <span className="flex items-center gap-2"><Film className="w-4 h-4 sm:w-5 sm:h-5" /> {displayData.data[0].owner.chineseName || displayData.data[0].owner.name}님의 작품</span>
                    <span>•</span>
                    <span>{new Date(displayData.data[0].createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      onClick={() => router.push(`/videos/${displayData.data[0].id}`)}
                      className="bg-white text-black hover:bg-neutral-200 font-extrabold px-10 py-7 rounded-xl text-lg sm:text-xl flex items-center gap-3 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:shadow-[0_0_60px_rgba(255,255,255,0.6)] hover:scale-105"
                    >
                      <Play className="w-6 h-6 fill-current" /> 재생
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ═══ Content Lists ═══ */}
        {isLoading ? (
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 pt-10">
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-${i}`} className="w-[300px] shrink-0 space-y-3">
                  <Skeleton className="aspect-video w-full rounded-xl bg-white/5" />
                  <Skeleton className="h-4 w-3/4 bg-white/5" />
                  <Skeleton className="h-3 w-1/2 bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ) : (!isDefaultView && !filteredData?.data.length) || (isDefaultView && !latestData?.data.length && !popularData?.data.length) ? (
          <div className="mx-auto max-w-[1920px] px-4 sm:px-6 py-20">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-3xl">
                <Film className="h-8 w-8 text-foreground dark:text-white" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground dark:text-white">
                {activeSearch || hasActiveFilter ? "조건에 맞는 영상이 없습니다" : "영상이 없습니다"}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {activeSearch || hasActiveFilter ? "다른 검색어나 필터 조합으로 시도해 보세요." : "아직 공개된 영상이 없습니다."}
              </p>
              {hasActiveFilter && (
                <button onClick={() => resetFilters("grid")} className="mt-4 rounded-full bg-black text-white dark:bg-white px-5 py-2.5 text-sm font-bold dark:text-black hover:opacity-80 transition-opacity">
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-10 pt-8">
            {!isDefaultView ? (
              <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-6">
                  {hasActiveFilter ? "탐색 결과" : "검색 결과"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                  {filteredData?.data.map((video, index) => {
                    const useSigned = !!video.signedThumbnailUrl;
                    return (
                      <div key={video.id} className="animate-in fade-in slide-in-from-bottom-4 group">
                        <VideoCard
                          id={video.id}
                          title={video.title}
                          thumbnailUrl={useSigned ? video.signedThumbnailUrl! : video.thumbnailUrl}
                          streamUid={useSigned ? null : video.streamUid}
                          duration={video.technicalSpec?.duration ?? null}
                          ownerName={video.owner.chineseName || video.owner.name}
                          categoryName={video.category?.name ?? null}
                          createdAt={video.createdAt}
                          viewCount={video.viewCount}
                          priority={page === 1 && index < 8}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <SwimlaneRow title="✨ 이제 막 올라온 따끈따끈한 새 영상" videos={latestData?.data || []} page={1} />
                <SwimlaneRow title="🔥 영감이 뿜뿜! 주간 인기 레퍼런스" videos={popularData?.data || []} page={1} />
                {catData?.data && catData.data.length > 0 && (
                  <SwimlaneRow title={`👀 다른 스타들은 [${randomCategoryName}]에서 어떻게 풀이했을까?`} videos={catData.data} page={1} />
                )}
              </>
            )}
          </div>
        )}

        {/* Minimal Pagination at Bottom - Only show when filtering */}
        {displayData && !isDefaultView && displayData.totalPages > 1 && (
          <div className="mt-12 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-6">
                이전
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(displayData.totalPages, 5) }).map((_, i) => {
                  let pageNum: number;
                  if (displayData.totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= displayData.totalPages - 2) pageNum = displayData.totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-9 min-w-9 rounded-full px-2 text-sm font-bold transition-colors ${pageNum === page ? "bg-black text-white dark:bg-white dark:text-black shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-zinc-500 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" disabled={page >= displayData.totalPages} onClick={() => setPage(page + 1)} className="text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-6">
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
