"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  all:    { label: "전체" },
  short:  { label: "~1분", max: 60 },
  medium: { label: "1~5분", min: 60, max: 300 },
  long:   { label: "5분+", min: 300 },
};

/* ───── Dropdown Component ───── */
function FilterDropdown({
  label,
  icon: Icon,
  isActive,
  children,
  onClear,
}: {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  children: React.ReactNode;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all duration-200
          ${isActive
            ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
            : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
      >
        <span className="opacity-70"><Icon className="w-4 h-4" /></span>
        <span className="font-medium">{label}</span>
        {isActive && onClear ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-0.5 rounded-full hover:bg-violet-500/20 p-0.5"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 min-w-[200px] max-h-[320px] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95">
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors
        ${active
          ? "bg-violet-500/15 text-violet-300 font-medium"
          : "text-foreground/80 hover:bg-accent"
        }`}
    >
      {children}
    </button>
  );
}

/* ───── Main Component ───── */
export function VideosBrowser() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
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
      const res = await fetch(buildEndpoint(), { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
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
  const durationLabel = durationRange !== "all" ? DURATION_RANGES[durationRange].label : "재생시간";

  return (
    <div className="min-h-screen">
      {/* ═══ Search Bar (필터 숨김, 검색만) ═══ */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1920px] flex items-center justify-center gap-4 px-4 py-3 sm:px-6">
          <form onSubmit={handleSearch} className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="영상 검색 (제목, 카테고리, 상담사...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-full pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setActiveSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Active search indicator */}
        {activeSearch && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span>&quot;{activeSearch}&quot; 검색 결과</span>
            <button
              onClick={() => { setActiveSearch(""); setSearch(""); setPage(1); }}
              className="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent"
            >
              초기화
            </button>
          </div>
        )}

        {/* Video Grid */}
        {isLoading ? (
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl dark:bg-violet-500/10">
              <Film className="h-8 w-8 text-violet-500" />
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
                className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnailUrl}
                streamUid={video.streamUid}
                duration={video.technicalSpec?.duration ?? null}
                ownerName={video.owner.chineseName || video.owner.name}
                categoryName={video.category?.name ?? null}
                createdAt={video.createdAt}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
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
                        ? "bg-violet-600 text-white"
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
        )}
      </div>
    </div>
  );
}
