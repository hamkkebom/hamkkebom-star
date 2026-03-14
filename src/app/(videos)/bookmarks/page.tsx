"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BookmarkedVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  streamUid: string | null;
  duration: number | null;
  ownerName: string;
  categoryName: string | null;
  createdAt: string;
  viewCount: number;
  bookmarkedAt: string;
};

type ApiResponse = {
  data: BookmarkedVideo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function BookmarksPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login?callbackUrl=/bookmarks");
    }
  }, [user, isAuthLoading, router]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["bookmarks", page],
    queryFn: async () => {
      const res = await fetch(`/api/videos/bookmarks?page=${page}&pageSize=12`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
    enabled: !!user,
  });

  if (isAuthLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <Bookmark className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">로그인이 필요합니다</h1>
        <p className="text-muted-foreground mb-8">로그인하고 마음에 드는 영상을 저장해보세요.</p>
        <Link href="/auth/login?callbackUrl=/bookmarks">
          <Button size="lg">로그인하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 flex items-center justify-center md:justify-start gap-2">
          <Bookmark className="w-8 h-8 text-primary" />
          저장한 영상
        </h1>
        <p className="text-muted-foreground text-lg">
          {isLoading ? (
            <Skeleton className="h-6 w-48 inline-block" />
          ) : (
            `총 ${data?.total || 0}개의 영상을 저장했습니다`
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed">
          <Bookmark className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">아직 저장한 영상이 없습니다</h3>
          <p className="text-muted-foreground mb-6">마음에 드는 영상을 찾아 저장해보세요.</p>
          <Link href="/videos">
            <Button variant="outline">영상 둘러보기</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {data?.data.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="relative group"
              >
                <VideoCard
                  id={video.id}
                  title={video.title}
                  thumbnailUrl={video.thumbnailUrl}
                  streamUid={video.streamUid}
                  duration={video.duration}
                  ownerName={video.ownerName}
                  categoryName={video.categoryName}
                  createdAt={video.createdAt}
                  viewCount={video.viewCount}
                />
                {/* Bookmark overlay button is handled inside VideoCard if it uses BookmarkButton, 
                    but since we need a specific "저장 해제" overlay, we can add it here */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 rounded-full shadow-md"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        await fetch(`/api/videos/${video.id}/bookmark`, { method: "DELETE" });
                        // In a real app, we'd invalidate the query here
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <div className="flex items-center px-4 text-sm font-medium">
                {page} / {data.totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
