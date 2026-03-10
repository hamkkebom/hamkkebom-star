"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronDown,
  X,
  Film,
  ChevronLeft,
  ChevronRight,
  Filter,
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
function FilterDropdown({
  label,
  icon: Icon,
  isActive,
  children,
  onClear,
  align = "right",
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  children: React.ReactNode;
  onClear?: () => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // 드롭다운 위치 계산 (버튼 기준 fixed)
  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const top = rect.bottom + 8;
      const margin = 12;

      // 600px 미만: 항상 풀너비 (좌우 margin)
      if (vw < 600) {
        setMenuStyle({ top, left: margin, right: margin });
      } else {
        // 데스크톱: 버튼 기준으로 정렬하되, 화면 밖 방지
        if (align === "right") {
          const rightVal = Math.max(margin, vw - rect.right);
          setMenuStyle({ top, right: rightVal, maxWidth: Math.min(400, vw - margin * 2) });
        } else {
          const leftVal = Math.max(margin, rect.left);
          setMenuStyle({ top, left: leftVal, maxWidth: Math.min(400, vw - margin * 2) });
        }
      }
    }
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    // mousedown + touchstart 둘 다 처리 → 모바일/데스크톱 호환
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
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

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] max-h-[60vh] overflow-y-auto rounded-2xl border border-black/5 bg-background/95 backdrop-blur-xl p-3 shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-black/10
            [&::-webkit-scrollbar-thumb]:rounded-full
            dark:[&::-webkit-scrollbar-thumb]:bg-white/10
            hover:[&::-webkit-scrollbar-thumb]:bg-black/20
            dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20"
          style={menuStyle}
        >
          {children}
        </div>,
        document.body,
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


  const setPage = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  // ─── 필터 상태를 URL searchParams에서 파생 (뒤로가기 시 유지) ───
  const categoryId = searchParams.get("categoryId") || null;
  const ownerId = searchParams.get("ownerId") || null;
  const counselorId = searchParams.get("counselorId") || null;
  const durationRange: DurationRange = (searchParams.get("duration") as DurationRange) || "all";
  const sort: "latest" | "oldest" = (searchParams.get("sort") as "latest" | "oldest") || "latest";

  const updateFilter = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const setCategoryId = useCallback((v: string | null) => updateFilter("categoryId", v), [updateFilter]);
  const setOwnerId = useCallback((v: string | null) => updateFilter("ownerId", v), [updateFilter]);
  const setCounselorId = useCallback((v: string | null) => updateFilter("counselorId", v), [updateFilter]);
  const setDurationRange = useCallback((v: DurationRange) => updateFilter("duration", v === "all" ? null : v), [updateFilter]);
  const setSort = useCallback((v: "latest" | "oldest") => updateFilter("sort", v === "latest" ? null : v), [updateFilter]);

  // Mobile Filter Sheet State
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [tempCategoryId, setTempCategoryId] = useState<string | null>(null);
  const [tempOwnerId, setTempOwnerId] = useState<string | null>(null);
  const [tempCounselorId, setTempCounselorId] = useState<string | null>(null);
  const [tempDurationRange, setTempDurationRange] = useState<DurationRange>("all");
  const [tempSort, setTempSort] = useState<"latest" | "oldest">("latest");

  const applyMobileFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    // 필터 전부 덮어쓰기
    if (tempCategoryId) params.set("categoryId", tempCategoryId); else params.delete("categoryId");
    if (tempOwnerId) params.set("ownerId", tempOwnerId); else params.delete("ownerId");
    if (tempCounselorId) params.set("counselorId", tempCounselorId); else params.delete("counselorId");
    if (tempDurationRange !== "all") params.set("duration", tempDurationRange); else params.delete("duration");
    if (tempSort !== "latest") params.set("sort", tempSort); else params.delete("sort");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setIsMobileFilterOpen(false);
  };

  const resetMobileFilters = () => {
    setTempCategoryId(null);
    setTempOwnerId(null);
    setTempCounselorId(null);
    setTempDurationRange("all");
    setTempSort("latest");
  };

  const activeFilterCount = (categoryId ? 1 : 0) + (ownerId ? 1 : 0) + (counselorId ? 1 : 0) + (durationRange !== "all" ? 1 : 0) + (sort !== "latest" ? 1 : 0);

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

  const { data: filteredData, isLoading: isFilteredLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse", activeSearch, page, categoryId, ownerId, counselorId, durationRange, sort],
    queryFn: async () => {
      const res = await fetch(buildEndpoint());
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    staleTime: 30_000,
  });

  const isLoading = isFilteredLoading;
  const displayData = filteredData;

  // ─── Handlers ───
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const resetFilters = useCallback((mode?: "home" | "grid") => {
    const params = new URLSearchParams();
    if (mode === "grid") params.set("view", "grid");
    params.set("page", "1");
    setActiveSearch("");
    setSearch("");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

  // ─── Labels for active state ───
  const catLabel = categoryId ? categories.find((c) => c.id === categoryId)?.name ?? "카테고리" : "카테고리";
  const ownerLabel = ownerId
    ? (() => { const o = owners.find((o) => o.id === ownerId); return o ? (o.chineseName || o.name) : "제작자"; })()
    : "제작자";
  const counselorLabel = counselorId
    ? counselors.find((c) => c.id === counselorId)?.displayName ?? "상담사"
    : "상담사";

  return (
    <div className="min-h-screen pb-20 md:pb-0">
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

            {/* Quick Filters (Segmented) */}
            <div className="flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
              <div className="flex p-1 bg-muted/50 rounded-full border border-black/5 dark:bg-zinc-900 dark:border-white/5">
                {(Object.entries(DURATION_RANGES) as [DurationRange, { label: string }][]).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setDurationRange(key)}
                    className={`px-4 py-2.5 md:py-1.5 rounded-full text-sm font-medium transition-all duration-300
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
                  onClick={() => setSort("latest")}
                  className={`px-4 py-2.5 md:py-1.5 rounded-full text-sm font-medium transition-all duration-300
                      ${sort === "latest"
                      ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  최신순
                </button>
                <button
                  onClick={() => setSort("oldest")}
                  className={`px-4 py-2.5 md:py-1.5 rounded-full text-sm font-medium transition-all duration-300
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
            <div className="hidden md:flex items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden w-full sm:w-auto justify-start sm:justify-end">

              {/* Category Dropdown (Grid) */}
              <FilterDropdown label={catLabel} icon={Film} isActive={!!categoryId} onClear={() => setCategoryId(null)} align="right">
                <div className="w-full sm:w-[320px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!categoryId} onClick={() => setCategoryId(null)}>
                      전체 카테고리
                    </DropdownItem>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {categories.map((c) => (
                      <DropdownItem key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} count={c._count.videos}>
                        {c.name}
                      </DropdownItem>
                    ))}
                  </div>
                </div>
              </FilterDropdown>

              {/* Owner Dropdown (Grid) */}
              <FilterDropdown label={ownerLabel} icon={Film} isActive={!!ownerId} onClear={() => setOwnerId(null)} align="right">
                <div className="w-full sm:w-[320px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!ownerId} onClick={() => setOwnerId(null)}>
                      전체 제작자
                    </DropdownItem>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {owners.map((o) => (
                      <DropdownItem key={o.id} active={ownerId === o.id} onClick={() => setOwnerId(o.id)} count={o.videoCount}>
                        {o.chineseName || o.name}
                      </DropdownItem>
                    ))}
                  </div>
                </div>
              </FilterDropdown>

              {/* Counselor Dropdown (List - usually fewer items, but keeping consistent) */}
              <FilterDropdown label={counselorLabel} icon={Film} isActive={!!counselorId} onClear={() => setCounselorId(null)} align="right">
                <div className="w-full sm:w-[280px] p-1">
                  <div className="mb-2 px-1">
                    <DropdownItem active={!counselorId} onClick={() => setCounselorId(null)}>
                      전체 상담사
                    </DropdownItem>
                  </div>
                  <div className="space-y-1">
                    {counselors.map((c) => (
                      <DropdownItem key={c.id} active={counselorId === c.id} onClick={() => setCounselorId(c.id)} count={c.videoCount}>
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

            {/* Mobile Filter Button */}
            <div className="md:hidden flex items-center">
              <Sheet open={isMobileFilterOpen} onOpenChange={(open) => {
                setIsMobileFilterOpen(open);
                if (open) {
                  setTempCategoryId(categoryId);
                  setTempOwnerId(ownerId);
                  setTempCounselorId(counselorId);
                  setTempDurationRange(durationRange);
                  setTempSort(sort);
                }
              }}>
                <SheetTrigger asChild>
                  <button className="relative flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background text-foreground text-sm font-medium">
                    <Filter className="w-4 h-4" />
                    필터
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 pb-0 flex flex-col">
                  <SheetHeader className="px-6 pb-4 border-b">
                    <SheetTitle className="text-left">필터</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
                    {/* Category */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">카테고리</h4>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTempCategoryId(null)} className={`px-4 py-2 rounded-full text-sm ${!tempCategoryId ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>전체</button>
                        {categories.map(c => (
                          <button key={c.id} onClick={() => setTempCategoryId(c.id)} className={`px-4 py-2 rounded-full text-sm ${tempCategoryId === c.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>{c.name}</button>
                        ))}
                      </div>
                    </div>
                    {/* Owner */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">제작자</h4>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTempOwnerId(null)} className={`px-4 py-2 rounded-full text-sm ${!tempOwnerId ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>전체</button>
                        {owners.map(o => (
                          <button key={o.id} onClick={() => setTempOwnerId(o.id)} className={`px-4 py-2 rounded-full text-sm ${tempOwnerId === o.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>{o.chineseName || o.name}</button>
                        ))}
                      </div>
                    </div>
                    {/* Counselor */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">상담사</h4>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTempCounselorId(null)} className={`px-4 py-2 rounded-full text-sm ${!tempCounselorId ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>전체</button>
                        {counselors.map(c => (
                          <button key={c.id} onClick={() => setTempCounselorId(c.id)} className={`px-4 py-2 rounded-full text-sm ${tempCounselorId === c.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>{c.displayName}</button>
                        ))}
                      </div>
                    </div>
                    {/* Duration */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">길이</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(DURATION_RANGES) as [DurationRange, { label: string }][]).map(([key, val]) => (
                          <button key={key} onClick={() => setTempDurationRange(key)} className={`px-4 py-2 rounded-full text-sm ${tempDurationRange === key ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>{val.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* Sort */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">정렬</h4>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setTempSort("latest")} className={`px-4 py-2 rounded-full text-sm ${tempSort === "latest" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>최신순</button>
                        <button onClick={() => setTempSort("oldest")} className={`px-4 py-2 rounded-full text-sm ${tempSort === "oldest" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted text-muted-foreground"}`}>오래된순</button>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t flex gap-3 bg-background">
                    <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={resetMobileFilters}>초기화</Button>
                    <Button className="flex-1 h-12 rounded-xl" onClick={applyMobileFilters}>적용</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Category Chips */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-3 scrollbar-none [&::-webkit-scrollbar]:hidden border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-[140px] z-30">
        <button
          onClick={() => setCategoryId(null)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!categoryId ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}
        >
          전체
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryId === c.id ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* ═══ Content Grid ═══ */}
      <div className="relative z-10 w-full pb-20 bg-background text-foreground transition-all duration-500">

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
        ) : !filteredData?.data?.length ? (
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
            <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-6">
                {hasActiveFilter ? "탐색 결과" : "전체 영상"}
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
          </div>
        )}

        {/* Pagination */}
        {displayData && displayData.totalPages > 1 && (
          <div className="mt-12 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-4 md:px-6 h-11 md:h-9">
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
                      className={`h-11 min-w-[44px] md:h-9 md:min-w-[36px] rounded-full px-2 text-sm font-bold transition-colors ${pageNum === page ? "bg-black text-white dark:bg-white dark:text-black shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-zinc-500 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button variant="ghost" size="sm" disabled={page >= displayData.totalPages} onClick={() => setPage(page + 1)} className="text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full px-4 md:px-6 h-11 md:h-9">
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
