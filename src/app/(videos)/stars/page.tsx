"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Search, Sparkles, MoveRight, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type StarItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  videoCount: number;
  createdAt: string;
};

type StarsResponse = {
  data: StarItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function StarsContent() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPageState] = useState(1);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL ?page= 파라미터에서 초기 페이지 읽기
  useEffect(() => {
    const urlPage = Number(searchParams.get("page")) || 1;
    if (urlPage !== page) setPageState(urlPage);
  }, [searchParams]);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const { data, isLoading } = useQuery<StarsResponse>({
    queryKey: ["stars-public", activeSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "12",
      });
      if (activeSearch) params.set("search", activeSearch);
      const res = await fetch(`/api/stars?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch stars");
      return (await res.json()) as StarsResponse;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(search);
    setPage(1);
  };

  const stars = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Premium Hero Section ─── */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-32">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-violet-500/10 blur-[100px] dark:bg-violet-500/20" />
          <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-y-1/2 rounded-full bg-amber-500/10 blur-[100px] dark:bg-amber-500/20" />
        </div>

        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-violet-200/50 bg-violet-50/50 px-4 py-1.5 text-sm font-medium text-violet-700 backdrop-blur-sm dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
            <span className="tracking-wide">HAMKKEBOM STARS</span>
          </div>

          <h1 className="animate-slide-up mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            <span className="block text-foreground">Next-Gen Creators</span>
            <span className="bg-linear-to-r from-violet-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-amber-400">
              Discover the Future
            </span>
          </h1>

          <p className="animate-slide-up animation-delay-100 mx-auto mt-6 max-w-2xl text-lg text-muted-foreground/80 sm:text-xl">
            함께봄이 엄선한 최고의 크리에이터들을 소개합니다.
            <br className="hidden sm:inline" /> 그들의 독창적인 포트폴리오와 인사이트를 만나보세요.
          </p>

          {/* Search Bar (Floating) */}
          <div className="animate-slide-up animation-delay-200 mx-auto mt-12 w-full max-w-lg">
            <form onSubmit={handleSearch} className="group relative">
              <div className="absolute inset-0 -z-10 rounded-2xl bg-linear-to-r from-violet-500/20 to-amber-500/20 blur-xl transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
              <div className="relative flex items-center overflow-hidden rounded-2xl border bg-background/80 shadow-2xl backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-violet-500/50 dark:bg-background/60">
                <Search className="ml-4 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Find your star..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 border-none bg-transparent px-4 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="m-1 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
                >
                  Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ─── Content Grid ─── */}
      <div className="mx-auto max-w-7xl px-6 pb-24">
        {activeSearch && (
          <div className="mb-10 flex items-center justify-between border-b pb-4">
            <p className="text-lg font-medium">
              &quot;{activeSearch}&quot; 검색 결과
            </p>
            <button
              onClick={() => { setActiveSearch(""); setSearch(""); setPage(1); }}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              전체 보기
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="flex flex-col gap-4">
                <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !stars.length ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed bg-muted/30">
            <div className="mb-6 rounded-full bg-muted p-6">
              <Star className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">No Stars Found</h3>
            <p className="mt-2 text-muted-foreground">새로운 스타가 곧 등장할 예정입니다.</p>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stars.map((star, idx) => (
              <div
                key={star.id}
                className="animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <PremiumStarCard star={star} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination (Minimal) */}
        {data && data.totalPages > 1 && (
          <div className="mt-20 flex justify-center gap-4">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <div className="flex items-center px-4 font-mono text-sm">
              {page} <span className="mx-2 text-muted-foreground">/</span> {data.totalPages}
            </div>
            <Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PremiumStarCard({ star }: { star: StarItem }) {
  return (
    <Link href={`/stars/profile/${star.id}`} className="group relative block">
      {/* Image Container */}
      <div className="relative aspect-[3.5/4.5] w-full overflow-hidden rounded-3xl bg-muted transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-violet-500/20 dark:group-hover:shadow-violet-900/40">
        {star.avatarUrl ? (
          <Image
            src={star.avatarUrl}
            alt={star.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-100 to-amber-100 text-6xl font-black text-violet-900/20 dark:from-violet-900/20 dark:to-amber-900/20 dark:text-white/20">
            {star.name.charAt(0)}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute bottom-0 left-0 p-6 opacity-0 transition-all duration-300 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
          <p className="line-clamp-3 text-sm font-medium leading-relaxed text-white/90">
            {star.bio || "No bio available."}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-400">
            <span>View Profile</span>
            <MoveRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Info (Outside) */}
      <div className="mt-5 space-y-1">
        <h3 className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400">
          {star.name}
        </h3>
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>{star.videoCount} Videos</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>Since {new Date(star.createdAt).getFullYear()}</span>
        </p>
      </div>
    </Link>
  );
}

export default function StarsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background pt-20 text-center">Loading stars...</div>}>
      <StarsContent />
    </Suspense>
  );
}
