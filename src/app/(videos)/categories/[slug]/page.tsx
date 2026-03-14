"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Home, PlayCircle, Heart, Star, Compass, BookOpen, Users, Sparkles, Video, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { VideoCard } from "@/components/video/video-card";

const iconMap: Record<string, LucideIcon> = {
  "play-circle": PlayCircle,
  "heart": Heart,
  "star": Star,
  "compass": Compass,
  "book-open": BookOpen,
  "users": Users,
  "sparkles": Sparkles,
  "video": Video,
};

export default function CategoryDetailPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="mb-12 flex flex-col items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <CategoryDetailContent />
    </Suspense>
  );
}

function CategoryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const sort = searchParams.get("sort") || "recent";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const res = await fetch(`/api/categories/${slug}`);
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="mb-12 flex flex-col items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState
          title="카테고리를 찾을 수 없습니다"
          description="존재하지 않거나 삭제된 카테고리입니다."
          action={
            <Button onClick={() => router.push("/categories")}>
              카테고리 목록으로
            </Button>
          }
        />
      </div>
    );
  }

  const { category, videos, creators, totalVideos } = data.data;
  const Icon = category.icon && iconMap[category.icon] ? iconMap[category.icon] : Video;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <Link href="/categories" className="hover:text-foreground transition-colors">
          카테고리
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="font-medium text-foreground">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">{category.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          총 {totalVideos}개의 영상
        </p>
      </div>

      {/* Top Creators */}
      {creators && creators.length > 0 && (
        <section className="mb-16">
          <h2 className="mb-6 text-xl font-bold">이 분야의 인기 크리에이터</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {creators.map((creator: { id: string; name: string; avatarUrl?: string }) => (
              <div key={creator.id} className="flex flex-col items-center rounded-xl border bg-card p-6 text-center shadow-sm">
                <Avatar className="mb-4 h-16 w-16 border-2 border-background shadow-sm">
                  <AvatarImage src={creator.avatarUrl || ""} alt={creator.name} />
                  <AvatarFallback>{creator.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{creator.name}</h3>
                <span className="mt-1 text-xs text-muted-foreground">STAR</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Videos */}
      <section className="mb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">인기 영상</h2>
          <div className="flex gap-2">
            <Button
              variant={sort === "recent" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => router.push(`/categories/${slug}?sort=recent`)}
            >
              최신순
            </Button>
            <Button
              variant={sort === "popular" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => router.push(`/categories/${slug}?sort=popular`)}
            >
              인기순
            </Button>
          </div>
        </div>

        {videos.length === 0 ? (
          <EmptyState
            title="영상이 없습니다"
            description="이 카테고리에 등록된 영상이 아직 없습니다."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {videos.map((video: { id: string; title: string; thumbnailUrl: string | null; streamUid: string | null; owner?: { name: string }; createdAt: string; viewCount: number }) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnailUrl}
                streamUid={video.streamUid}
                duration={null}
                ownerName={video.owner?.name || "알 수 없음"}
                categoryName={category.name}
                createdAt={video.createdAt}
                viewCount={video.viewCount}
              />
            ))}
          </div>
        )}
      </section>

      {/* Other Categories */}
      {categoriesData?.data && categoriesData.data.length > 1 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">다른 카테고리 둘러보기</h2>
          <div className="flex gap-2 overflow-x-auto pb-4">
            {categoriesData.data
              .filter((c: { id: string; slug: string; name: string }) => c.slug !== slug)
              .map((c: { id: string; slug: string; name: string }) => (
                <Link key={c.id} href={`/categories/${c.slug}`}>
                  <Badge variant="outline" className="px-4 py-2 text-sm hover:bg-accent whitespace-nowrap">
                    {c.name}
                  </Badge>
                </Link>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
