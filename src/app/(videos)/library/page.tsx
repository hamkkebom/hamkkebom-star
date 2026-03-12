"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Library,
  Heart,
  Bookmark,
  UserCheck,
  ChevronRight,
  Play,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/video/video-card";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  streamUid: string | null;
  duration: number | null;
  ownerName: string;
  categoryName: string | null;
  createdAt: string;
  viewCount: number;
};

type VideoApiResponse = {
  data: VideoItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FollowingUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  videoCount: number;
  followedAt: string;
};

type FollowingApiResponse = {
  data: FollowingUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Section Header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number | undefined;
  href: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <Icon className={cn("h-5 w-5", iconClassName ?? "text-primary")} />
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <Link
        href={href}
        className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        모두 보기
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loaders                                                   */
/* ------------------------------------------------------------------ */

function VideoRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0 space-y-3">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function FollowingRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5"
        >
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty states                                                       */
/* ------------------------------------------------------------------ */

function SectionEmpty({
  icon: Icon,
  message,
}: {
  icon: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function AllEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Library className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="mb-2 text-xl font-bold">라이브러리가 비어있습니다</h2>
      <p className="mb-8 max-w-sm text-muted-foreground">
        마음에 드는 영상에 좋아요를 누르거나, 저장하거나, 크리에이터를 팔로우해보세요.
      </p>
      <Link href="/videos">
        <Button variant="outline" className="gap-2">
          <Play className="h-4 w-4" />
          영상 둘러보기
        </Button>
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Following user card                                                */
/* ------------------------------------------------------------------ */

function FollowingCard({ user }: { user: FollowingUser }) {
  return (
    <Link
      href={`/stars/profile/${user.id}`}
      className="group min-w-[160px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted ring-2 ring-border transition-all group-hover:ring-primary/40">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
      </div>
      <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[180px]">
        {user.name}
      </span>
      <span className="text-xs text-muted-foreground">
        영상 {user.videoCount}개
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function LibraryPage() {
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const router = useRouter();

  /* Auth redirect */
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login?callbackUrl=/library");
    }
  }, [user, isAuthLoading, router]);

  /* Data fetching — 3 parallel queries */
  const {
    data: likesData,
    isLoading: likesLoading,
  } = useQuery<VideoApiResponse>({
    queryKey: ["library", "likes"],
    queryFn: async () => {
      const res = await fetch("/api/videos/likes?page=1&pageSize=6");
      if (!res.ok) throw new Error("Failed to fetch likes");
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: bookmarksData,
    isLoading: bookmarksLoading,
  } = useQuery<VideoApiResponse>({
    queryKey: ["library", "bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/videos/bookmarks?page=1&pageSize=6");
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
    enabled: !!user,
  });

  const {
    data: followingData,
    isLoading: followingLoading,
  } = useQuery<FollowingApiResponse>({
    queryKey: ["library", "following"],
    queryFn: async () => {
      const res = await fetch("/api/users/me/following?page=1&pageSize=6");
      if (!res.ok) throw new Error("Failed to fetch following");
      return res.json();
    },
    enabled: !!user,
  });

  /* Auth loading state */
  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 flex justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  /* Not logged in fallback */
  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Library className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">로그인이 필요합니다</h1>
        <p className="mb-8 text-muted-foreground">
          로그인하고 나만의 라이브러리를 만들어보세요.
        </p>
        <Link href="/auth/login?callbackUrl=/library">
          <Button size="lg">로그인하기</Button>
        </Link>
      </div>
    );
  }

  /* Check if all sections are empty (after loading) */
  const allLoaded = !likesLoading && !bookmarksLoading && !followingLoading;
  const allEmpty =
    allLoaded &&
    (likesData?.data.length ?? 0) === 0 &&
    (bookmarksData?.data.length ?? 0) === 0 &&
    (followingData?.data.length ?? 0) === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12 pb-20 md:pb-12">
      {/* Page title */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center justify-center md:justify-start gap-2.5">
          <Library className="h-8 w-8 text-primary" />
          내 라이브러리
        </h1>
        <p className="text-muted-foreground">
          좋아요, 저장, 팔로잉을 한눈에 모아보세요.
        </p>
      </div>

      {allEmpty ? (
        <AllEmptyState />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Section 1: 좋아요한 영상 */}
          <motion.section variants={sectionVariants} className="mb-12">
            <SectionHeader
              icon={Heart}
              title="좋아요한 영상"
              count={likesData?.total}
              href="/likes"
              iconClassName="text-rose-500"
            />
            {likesLoading ? (
              <VideoRowSkeleton />
            ) : (likesData?.data.length ?? 0) === 0 ? (
              <SectionEmpty
                icon={Heart}
                message="아직 좋아요한 영상이 없습니다."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
                {likesData?.data.map((video) => (
                  <div
                    key={video.id}
                    className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0 snap-start"
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
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Section 2: 저장한 영상 */}
          <motion.section variants={sectionVariants} className="mb-12">
            <SectionHeader
              icon={Bookmark}
              title="저장한 영상"
              count={bookmarksData?.total}
              href="/bookmarks"
            />
            {bookmarksLoading ? (
              <VideoRowSkeleton />
            ) : (bookmarksData?.data.length ?? 0) === 0 ? (
              <SectionEmpty
                icon={Bookmark}
                message="아직 저장한 영상이 없습니다."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
                {bookmarksData?.data.map((video) => (
                  <div
                    key={video.id}
                    className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] flex-shrink-0 snap-start"
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
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          {/* Section 3: 팔로잉 */}
          <motion.section variants={sectionVariants} className="mb-12">
            <SectionHeader
              icon={UserCheck}
              title="팔로잉"
              count={followingData?.total}
              href="/following"
            />
            {followingLoading ? (
              <FollowingRowSkeleton />
            ) : (followingData?.data.length ?? 0) === 0 ? (
              <SectionEmpty
                icon={UserCheck}
                message="아직 팔로우한 크리에이터가 없습니다."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
                {followingData?.data.map((followedUser) => (
                  <FollowingCard key={followedUser.id} user={followedUser} />
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </div>
  );
}
