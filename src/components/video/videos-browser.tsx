"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronDown,
  X,
  Film,
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
    params.set("pageSize", "18");
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

  const { data, isLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse", activeSearch, page, categoryId, ownerId, counselorId, durationRange, sort],
    queryFn: async () => {
      const res = await fetch(buildEndpoint());
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
    staleTime: 30_000,
  });

  // ─── Handlers ───
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const resetFilters = () => {
    setCategoryId(null);
    setOwnerId(null);
    setCounselorId(null);
    setDurationRange("all");
    setActiveSearch("");
    setSearch("");
    setSort("latest");
    setPage(1);
  };

  const hasActiveFilter = categoryId || ownerId || counselorId || durationRange !== "all" || activeSearch;

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
                  onClick={resetFilters}
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

      {/* ═══ Content ═══ */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Active search indicator */}
        {
          activeSearch && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>&quot;{activeSearch}&quot; 검색 결과</span>
              <button
                onClick={() => { setActiveSearch(""); setSearch(""); setPage(1); }}
                className="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent"
              >
                초기화
              </button>
            </div>
          )
        }

        {/* Video Grid */}
        {
          isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skel-${i}`} className="space-y-3">
                  <Skeleton className="aspect-video w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : !data?.data.length ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-3xl dark:bg-zinc-800">
                <Film className="h-8 w-8 text-black dark:text-white" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">
                {activeSearch || hasActiveFilter ? "조건에 맞는 영상이 없습니다" : "영상이 없습니다"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeSearch || hasActiveFilter
                  ? "다른 검색어나 필터 조합으로 시도해 보세요."
                  : "아직 공개된 영상이 없습니다. 곧 추가될 예정이에요!"}
              </p>
              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  필터 초기화
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((video, index) => {
                // 서명된 썸네일 URL 우선 사용, 이 경우 streamUid를 null로 넘겨 
                // VideoCard 컴포넌트 내부에서 강제로 URL을 더럽히지(오염) 않도록 함.
                const useSigned = !!video.signedThumbnailUrl;

                return (
                  <VideoCard
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    thumbnailUrl={useSigned ? video.signedThumbnailUrl! : video.thumbnailUrl}
                    streamUid={useSigned ? null : video.streamUid}
                    duration={video.technicalSpec?.duration ?? null}
                    ownerName={video.owner.chineseName || video.owner.name}
                    categoryName={video.category?.name ?? null}
                    createdAt={video.createdAt}
                    priority={page === 1 && index < 3}
                  />
                )
              })}
            </div>
          )
        }

        {/* Pagination */}
        {
          data && data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                이전
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(data.totalPages, 7) }).map((_, i) => {
                  let pageNum: number;
                  if (data.totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= data.totalPages - 3) {
                    pageNum = data.totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors
                      ${pageNum === page
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                다음
              </Button>

              <span className="ml-2 text-xs text-muted-foreground">
                총 {data.total}개
              </span>
            </div>
          )
        }
      </div>
    </div>
  );
}
