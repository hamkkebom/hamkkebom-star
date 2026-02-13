"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Film, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  _count: { videos: number };
};

type VideoRow = {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string | null;
  streamUid: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  category: { id: string; name: string; slug: string } | null;
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

export function VideosBrowser() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<"latest" | "oldest">("latest");

  // 카테고리 목록
  const { data: categoriesData } = useQuery<{ data: CategoryRow[] }>({
    queryKey: ["video-categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
    staleTime: 60_000,
  });

  // 영상 목록 — 항상 최신순 그리드
  const buildEndpoint = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "18");
    params.set("sort", sort);
    if (categoryId) params.set("categoryId", categoryId);

    if (activeSearch.trim()) {
      params.set("q", activeSearch.trim());
      return `/api/videos/search?${params.toString()}`;
    }
    return `/api/videos?${params.toString()}`;
  }, [page, sort, categoryId, activeSearch]);

  const { data, isLoading } = useQuery<VideosResponse>({
    queryKey: ["videos-browse", activeSearch, page, categoryId, sort],
    queryFn: async () => {
      const res = await fetch(buildEndpoint(), { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 불러오는데 실패했습니다.");
      return (await res.json()) as VideosResponse;
    },
  });

  const categories = categoriesData?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const handleCategoryClick = (id: string | null) => {
    setCategoryId(id);
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-linear-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.06),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 rounded-full bg-violet-100/80 px-4 py-1.5 text-sm font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
              <Film className="h-4 w-4" />
              영상 라이브러리
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
                별들이 만든 영상
              </span>
              을 만나보세요
            </h1>
            <p className="mb-8 max-w-lg text-sm text-muted-foreground sm:text-base">
              AI 영상 크리에이터들의 작품을 탐색하고, 원하는 영상을 찾아보세요.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex w-full max-w-lg gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="영상 제목이나 설명으로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-10 ring-offset-violet-50 dark:ring-offset-background"
                />
              </div>
              <Button type="submit" className="h-11 bg-violet-600 px-5 hover:bg-violet-700">
                검색
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* 카테고리 필터 + 정렬 */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => handleCategoryClick(null)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all
                ${!categoryId
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all
                  ${categoryId === cat.id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                {cat.name}
                <span className="ml-1 opacity-60">({cat._count.videos})</span>
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => {
              setSort(sort === "latest" ? "oldest" : "latest");
              setPage(1);
            }}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sort === "latest" ? "최신순" : "오래된순"}
          </Button>
        </div>

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

        {/* ─── 영상 그리드 (최신순 기본) ─── */}
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
              🎬
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              {activeSearch ? "검색 결과가 없습니다" : "영상이 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeSearch
                ? "다른 키워드로 검색해 보세요."
                : "아직 공개된 영상이 없습니다. 곧 추가될 예정이에요!"}
            </p>
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
                ownerName={video.owner.name}
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

