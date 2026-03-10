"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, PenSquare, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardTabs } from "@/components/community/board-tabs";
import { PostListItem } from "@/components/community/post-list-item";
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
    <div className="container max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-8 min-h-screen flex flex-col">
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

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="게시글 검색..."
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
            className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="divide-y divide-border"
          >
            {posts.map((post: any, i: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <PostListItem post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">아직 게시글이 없습니다</h3>
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

      <Link href="/community/write" className="fixed bottom-24 right-6 md:hidden z-50">
        <Button size="icon" className="w-14 h-14 rounded-full shadow-lg bg-violet-600 hover:bg-violet-700 text-white">
          <PenSquare className="w-6 h-6" />
        </Button>
      </Link>
    </div>
  );
}
