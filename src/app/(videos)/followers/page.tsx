"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type FollowerUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  videoCount: number;
  isFollowingBack: boolean;
  followedAt: string;
};

type ApiResponse = {
  data: FollowerUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function FollowersPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login?callbackUrl=/followers");
    }
  }, [user, isAuthLoading, router]);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["followers", page],
    queryFn: async () => {
      const res = await fetch(
        `/api/users/me/followers?page=${page}&pageSize=20`
      );
      if (!res.ok) throw new Error("Failed to fetch followers");
      return res.json();
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const res = await fetch(`/api/users/${targetId}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to follow");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      toast.success("팔로우했습니다.");
    },
    onError: () => {
      toast.error("팔로우에 실패했습니다.");
    },
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
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">로그인이 필요합니다</h1>
        <p className="text-muted-foreground mb-8">
          로그인하고 팔로워를 확인해보세요.
        </p>
        <Link href="/auth/login?callbackUrl=/followers">
          <Button size="lg">로그인하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 md:py-12 pb-20 md:pb-12">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 flex items-center justify-center md:justify-start gap-2">
          <Users className="w-8 h-8 text-primary" />
          팔로워
        </h1>
        <div className="text-muted-foreground text-lg">
          {isLoading ? (
            <Skeleton className="h-6 w-64 inline-block" />
          ) : (
            `총 ${data?.total || 0}명이 나를 팔로우하고 있습니다`
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">아직 팔로워가 없습니다</h3>
          <p className="text-muted-foreground mb-6">
            영상을 올리고 활동하면 팔로워가 늘어납니다.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {data?.data.map((follower, i) => (
              <motion.div
                key={follower.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="group relative rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
                  <Link
                    href={`/stars/profile/${follower.id}`}
                    className="flex items-center gap-3 mb-3"
                  >
                    {follower.avatarUrl ? (
                      <Image
                        src={follower.avatarUrl}
                        alt={follower.name}
                        width={48}
                        height={48}
                        className="rounded-full object-cover w-12 h-12"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold truncate">
                          {follower.name}
                        </p>
                        {follower.isFollowingBack && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 shrink-0"
                          >
                            맞팔로우
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        영상 {follower.videoCount}개
                      </span>
                    </div>
                  </Link>
                  {follower.isFollowingBack ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-10"
                      disabled={followMutation.isPending}
                      onClick={() => followMutation.mutate(follower.id)}
                    >
                      언팔로우
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full h-10"
                      disabled={followMutation.isPending}
                      onClick={() => followMutation.mutate(follower.id)}
                    >
                      팔로우
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                className="h-10"
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
                className="h-10"
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
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
