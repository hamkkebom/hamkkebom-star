"use client";

import { Suspense, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, PenSquare, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardTabs } from "@/components/community/board-tabs";
import { PostListItem } from "@/components/community/post-list-item";
import { CommunityLeftNav } from "@/components/community/left-nav/community-left-nav";
import { CommunitySidebar } from "@/components/community/sidebar/community-sidebar";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CommunityContent />
    </Suspense>
  );
}

function CommunityContent() {
  const [boardType, setBoardType] = useState("");
  const [sort, setSort] = useState("latest");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  
  const search = useDebounce(searchInput, 350);

  const { data, isLoading } = useQuery({
    queryKey: ["board-posts", { boardType, sort, page, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        ...(boardType && { boardType }),
        ...(sort && { sort }),
        ...(search && { q: search }),
      });
      const res = await fetch(`/api/board/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
  });

  const posts = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="container max-w-[1400px] mx-auto px-4 py-8 md:py-12 pb-20 md:pb-16 min-h-screen flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[220px_1fr_320px] gap-6 xl:gap-8 flex-1 items-start">
        
        {/* 1. Left Navigation (Desktop Only) */}
        <aside className="hidden lg:block sticky top-24 h-fit">
          <CommunityLeftNav />
        </aside>

        {/* 2. Main Content Area */}
        <main className="min-w-0 flex flex-col w-full h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">커뮤니티</h1>
        <BoardTabs activeTab={boardType} onChange={(tab) => { setBoardType(tab); setPage(1); }} />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center bg-muted p-1 rounded-lg">
          {[
            { value: "latest", label: "최신순" },
            { value: "popular", label: "인기순" },
            { value: "comments", label: "댓글순" },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => { setSort(s.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                sort === s.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="게시글 검색..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background h-10"
          />
        </div>
      </div>

      <div className={cn("flex-1", boardType === "SHOWCASE" && "bg-transparent border-none")}>
        {isLoading ? (
          <div className={cn(
            boardType === "SHOWCASE" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" 
              : "grid grid-cols-1 sm:grid-cols-2 gap-5 md:flex md:flex-col md:gap-0 md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm md:overflow-hidden"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              boardType === "SHOWCASE" ? (
                <div key={i} className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="">
                   <div className="md:hidden rounded-2xl border border-border bg-card flex flex-col h-[200px] shadow-sm">
                      <div className="p-5 flex-1 space-y-3">
                          <Skeleton className="h-5 w-16 rounded-md" />
                          <Skeleton className="h-6 w-11/12" />
                          <Skeleton className="h-4 w-full mt-4" />
                          <Skeleton className="h-4 w-2/3" />
                      </div>
                      <div className="px-5 py-3.5 bg-muted/10 border-t border-border/50 flex justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-16" />
                      </div>
                   </div>
                   <div className="hidden md:flex items-center justify-between px-5 py-4 border-b border-border/50 last:border-0 bg-card">
                      <div className="flex items-center gap-4 flex-1 pr-4">
                          <Skeleton className="h-5 w-16 rounded-md shrink-0" />
                          <Skeleton className="h-5 w-3/4 max-w-md shrink-0" />
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                          <Skeleton className="h-4 w-20 shrink-0" />
                          <Skeleton className="h-4 w-16 shrink-0" />
                          <Skeleton className="h-4 w-24 shrink-0" />
                      </div>
                   </div>
                </div>
              )
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div
             className={cn(
               "animate-in fade-in-0 duration-300",
               boardType === "SHOWCASE" 
                 ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" 
                 : "grid grid-cols-1 sm:grid-cols-2 gap-5 md:flex md:flex-col md:gap-0 md:bg-card md:rounded-2xl md:border md:border-border md:shadow-sm md:overflow-hidden"
             )}
          >
            {/* Header row for desktop list */}
            {boardType !== "SHOWCASE" && (
                <div className="hidden md:flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border text-[13px] font-bold text-muted-foreground/80">
                    <div className="flex-1 pl-[92px]">제목</div>
                    <div className="flex items-center gap-6">
                        <div className="w-[120px] text-left">작성자</div>
                        <div className="w-[70px] text-right">작성일</div>
                        <div className="w-[140px] text-right pr-1">조회 / 공감 / 댓글</div>
                    </div>
                </div>
            )}
            {posts.map((post: { id: string; boardType: string; title: string; content?: string; isPinned: boolean; isNotice: boolean; viewCount: number; likeCount: number; createdAt: string; thumbnailUrl?: string | null; videoId?: string | null; tags?: string[]; author: { name: string; chineseName: string | null; avatarUrl: string | null; role: string }; _count: { comments: number; likes: number } }, i: number) => (
              <div
                key={post.id}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}
              >
                <PostListItem post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-card rounded-xl border border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {boardType === "SHOWCASE" ? "아직 공유된 작품이 없습니다" : 
               boardType === "QNA" ? "아직 등록된 질문이 없습니다" : 
               boardType === "RECRUITMENT" ? "아직 모집 중인 글이 없습니다" : 
               "아직 게시글이 없습니다"}
            </h3>
            <p className="text-muted-foreground mb-6">첫 글을 작성해보세요!</p>
            <Button asChild variant="default">
              <Link href="/community/write">글쓰기</Link>
            </Button>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-4">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
        </main>

        {/* 3. Right Sidebar (Tablet & Desktop) */}
        <aside className="hidden md:block sticky top-24 h-fit">
          <CommunitySidebar searchQuery={searchInput} setSearchQuery={setSearchInput} setPage={setPage} />
        </aside>
      </div>

      <Link href="/community/write" className="fixed bottom-24 right-6 md:hidden z-50">
        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg bg-violet-600 hover:bg-violet-700 text-white">
          <PenSquare className="w-6 h-6" />
        </Button>
      </Link>
    </div>
  );
}
