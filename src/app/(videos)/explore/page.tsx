"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Film, Users, MessageSquare, Eye, Heart, X, TrendingUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type VideoResult = {
  id: string;
  title: string;
  viewCount: number;
  createdAt: string;
  owner: { id: string; name: string; chineseName: string | null };
  category: { name: string } | null;
};

type PostResult = {
  id: string;
  title: string;
  boardType: string;
  viewCount: number;
  createdAt: string;
  author: { name: string; chineseName: string | null };
  _count: { comments: number; likes: number };
};

type StarResult = {
  id: string;
  name: string;
  chineseName: string | null;
  avatarUrl: string | null;
  _count: { videos: number; followers: number };
};

type SearchResponse = {
  videos: VideoResult[];
  posts: PostResult[];
  stars: StarResult[];
};

const POPULAR_TAGS = ["영상 편집", "모션그래픽", "뮤직비디오", "브이로그", "광고"];

const BOARD_TYPES: Record<string, string> = {
  FREE: "자유",
  QNA: "Q&A",
  TIPS: "제작 팁",
  SHOWCASE: "작품 자랑",
  RECRUITMENT: "협업 모집",
  NOTICE: "공지",
};

function getBoardTypeName(type: string) {
  return BOARD_TYPES[type] || type;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "방금 전";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}일 전`;
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreLoading />}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 pb-20 md:pb-0">
      <Skeleton className="mx-auto h-14 w-full max-w-2xl rounded-2xl" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Sync URL
  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    if (debouncedQuery !== currentQ) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedQuery) {
        params.set("q", debouncedQuery);
      } else {
        params.delete("q");
      }
      router.replace(`/explore?${params.toString()}`, { scroll: false });
    }
  }, [debouncedQuery, router, searchParams]);

  const { data, isLoading, isError } = useQuery<SearchResponse>({
    queryKey: ["search-unified", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: !!debouncedQuery,
  });

  const hasResults = data && (data.videos.length > 0 || data.stars.length > 0 || data.posts.length > 0);

  return (
    <main className="container max-w-6xl mx-auto px-4 pt-8 pb-20 md:pb-12 min-h-screen">
      {/* Search Header */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-6 h-6 transition-colors group-focus-within:text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="w-full pl-14 pr-12 h-16 text-lg rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background shadow-sm transition-all"
            autoFocus
          />
          {query && (
            <button 
              onClick={() => setQuery("")} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Initial State: Popular Tags */}
        {!debouncedQuery && (
          <div 
            className="mt-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              인기 검색어
            </h2>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-sm py-2 px-4 rounded-full transition-colors"
                  onClick={() => setQuery(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="mt-16 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>검색어를 입력하여 영상, 크리에이터, 커뮤니티 글을 찾아보세요.</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && debouncedQuery && (
        <div className="space-y-12">
          <section>
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[280px] md:w-1/4 shrink-0 space-y-3">
                  <Skeleton className="aspect-video rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </section>
          <section>
            <Skeleton className="h-8 w-40 mb-6" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-[160px] shrink-0 space-y-3">
                  <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-20 text-destructive">
          <p>검색 중 오류가 발생했습니다. 다시 시도해주세요.</p>
        </div>
      )}

      {/* No Results State */}
      {data && !hasResults && (
        <div 
          className="text-center py-20 animate-in fade-in-0 duration-300"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium mb-2">&apos;{debouncedQuery}&apos;에 대한 검색 결과가 없습니다.</h3>
          <p className="text-muted-foreground">다른 검색어를 입력하거나 철자를 확인해보세요.</p>
        </div>
      )}

      {/* Results State */}
      {data && hasResults && (
        <div className="space-y-12 animate-in fade-in-0 duration-300">
          {/* Section 1: Videos */}
          {data.videos.length > 0 && (
            <section className="animate-in fade-in-0 slide-in-from-bottom-5 duration-400" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Film className="w-5 h-5 text-primary" />
                🎬 영상 <span className="text-muted-foreground text-sm font-normal">{data.videos.length}</span>
              </h2>
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 gap-4 snap-x hide-scrollbar">
                {data.videos.map((video) => (
                  <Link 
                    key={video.id} 
                    href={`/videos/${video.id}`} 
                    className="snap-start shrink-0 w-[280px] md:w-auto group"
                  >
                    <div className="aspect-video bg-muted rounded-xl mb-3 overflow-hidden relative border border-border/50">
                      <div className="absolute inset-0 bg-secondary/20 group-hover:bg-transparent transition-colors" />
                      {video.category && (
                        <Badge className="absolute top-2 right-2 bg-black/60 hover:bg-black/60 text-white border-none backdrop-blur-sm">
                          {video.category.name}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                      <span>{video.owner.chineseName || video.owner.name}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {video.viewCount.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Stars */}
          {data.stars.length > 0 && (
            <section className="animate-in fade-in-0 slide-in-from-bottom-5 duration-400" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                ⭐ 크리에이터 <span className="text-muted-foreground text-sm font-normal">{data.stars.length}</span>
              </h2>
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 gap-4 snap-x hide-scrollbar">
                {data.stars.map((star) => (
                  <Link 
                    key={star.id} 
                    href={`/stars/profile/${star.id}`} 
                    className="snap-start shrink-0 w-[160px] p-5 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all flex flex-col items-center text-center group"
                  >
                    <div className="w-20 h-20 rounded-full bg-muted mb-4 overflow-hidden flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-transparent group-hover:border-primary/20 transition-colors">
                      {star.avatarUrl ? (
                        <img src={star.avatarUrl} alt={star.name} className="w-full h-full object-cover" />
                      ) : (
                        (star.chineseName || star.name).charAt(0)
                      )}
                    </div>
                    <h3 className="font-medium truncate w-full group-hover:text-primary transition-colors">
                      {star.chineseName || star.name}
                    </h3>
                    <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1" title="영상 수">
                        <Film className="w-3 h-3" /> {star._count.videos}
                      </span>
                      <span className="flex items-center gap-1" title="팔로워">
                        <Heart className="w-3 h-3" /> {star._count.followers}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Section 3: Posts */}
          {data.posts.length > 0 && (
            <section className="animate-in fade-in-0 slide-in-from-bottom-5 duration-400" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-primary" />
                💬 커뮤니티 <span className="text-muted-foreground text-sm font-normal">{data.posts.length}</span>
              </h2>
              <div className="flex flex-col gap-3">
                {data.posts.map((post) => (
                  <Link 
                    key={post.id} 
                    href={`/community/${post.id}`} 
                    className="p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0 mt-0.5 bg-muted/50">
                        {getBoardTypeName(post.boardType)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors text-base">
                          {post.title}
                        </h3>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            {post.author.chineseName || post.author.name}
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {post.viewCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" /> {post._count.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" /> {post._count.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
