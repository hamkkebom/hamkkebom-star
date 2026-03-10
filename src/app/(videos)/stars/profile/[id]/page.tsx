"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Play,
  Share2,
  Tv,
  Users,
  UserPlus,
  UserCheck,
  Youtube,
  Instagram,
  Heart,
  Eye,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { motion } from "framer-motion";
import NumberTicker from "@/components/ui/number-ticker";

type StarDetail = {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  bio: string | null;
  showreel: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  portfolioItems: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    videoUrl: string | null;
  }[];
  videos: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    streamUid: string | null;
    createdAt: string;
    category: { id: string; name: string; slug: string } | null;
    technicalSpec: { duration: number | null } | null;
  }[];
  videoCount: number;
  followerCount: number;
  totalViews: number;
  totalLikes: number;
};

type FollowData = {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export default function StarProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"featured" | "portfolio" | "all">("featured");

  const { data, isLoading, error } = useQuery<{ data: StarDetail }>({
    queryKey: ["star-profile", id],
    queryFn: () => fetch(`/api/stars/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: followData } = useQuery<FollowData>({
    queryKey: ["star-follow", id],
    queryFn: () => fetch(`/api/users/${id}/follow`).then((r) => r.json()),
    enabled: !!id,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${id}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle follow");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["star-follow", id] });
      const previousData = queryClient.getQueryData<FollowData>(["star-follow", id]);
      
      if (previousData) {
        queryClient.setQueryData<FollowData>(["star-follow", id], {
          ...previousData,
          isFollowing: !previousData.isFollowing,
          followerCount: previousData.isFollowing 
            ? previousData.followerCount - 1 
            : previousData.followerCount + 1,
        });
      }
      return { previousData };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["star-follow", id], context.previousData);
      }
      toast.error("팔로우 상태를 변경하지 못했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["star-follow", id] });
    },
  });

  const handleFollowClick = () => {
    if (isAuthLoading) return;
    if (!user) {
      toast.error("로그인이 필요합니다.");
      router.push("/auth/login");
      return;
    }
    toggleFollow.mutate();
  };

  const handleShare = () => {
    if (!star) return;
    const title = `${star.name} 프로필`;
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("링크가 복사되었습니다.");
    }
  };

  if (!isLoading && (error || !data?.data)) return <NotFoundState />;

  const star = data?.data ?? null;

  // Split videos into featured (latest 2) and others
  const featuredVideos = star?.videos.slice(0, 2) ?? [];
  const otherVideos = star?.videos.slice(2) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0">
      {/* ─── Immersive Header ─── */}
      <section className="relative flex min-h-[40vh] md:min-h-[50vh] flex-col justify-end border-b bg-muted/30 pb-10 md:pb-16 pt-24 md:pt-32 dark:bg-muted/5">
        {/* Background Accents — 항상 즉시 표시 */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[20%] right-[10%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
          <div className="absolute -left-[10%] top-[40%] h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          {/* 뒤로가기 — 항상 즉시 표시 */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="absolute left-4 top-6 md:left-12 md:top-12 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Stars
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end md:gap-12">
            {/* Large Avatar */}
            <div className="relative mb-6 md:mb-0 shrink-0 flex justify-center md:justify-start">
              <div className="h-32 w-32 md:h-56 md:w-56 overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-background shadow-2xl ring-4 md:ring-8 ring-background dark:ring-white/5">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : star?.avatarUrl ? (
                  <Image
                    src={star.avatarUrl}
                    alt={star.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-5xl md:text-6xl font-black text-muted-foreground/30">
                    {star?.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left">
              {isLoading ? (
                <div className="flex flex-col items-center md:items-start">
                  <div className="space-y-3 w-full flex flex-col items-center md:items-start">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-12 md:h-16 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-full max-w-md mt-4" />
                  <Skeleton className="h-6 w-1/2 max-w-xs mt-2" />
                </div>
              ) : star ? (
                <>
                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                        STAR CREATOR
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">
                        Joined {new Date(star.createdAt).getFullYear()}
                      </span>
                      {followData && (
                        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {followData.followerCount} 팔로워
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight">
                        {star.name}
                      </h1>
                      <Button
                        onClick={handleFollowClick}
                        disabled={toggleFollow.isPending}
                        variant={followData?.isFollowing ? "outline" : "default"}
                        className="w-full md:w-auto rounded-full font-bold shadow-sm transition-all"
                        size="lg"
                      >
                        {followData?.isFollowing ? (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            팔로잉
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            팔로우
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground mx-auto md:mx-0">
                    {star.bio || "영상으로 세상을 연결하는 크리에이터입니다."}
                  </p>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 md:flex md:flex-row gap-3 md:gap-6 py-4">
                    <div className="flex flex-col items-center md:items-start rounded-xl bg-background/50 p-3 md:p-0 md:bg-transparent border md:border-none border-border/50">
                      <span className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Video className="h-3 w-3" /> 영상</span>
                      <span className="text-xl md:text-2xl font-bold"><NumberTicker value={star.videoCount} />개</span>
                    </div>
                    <div className="flex flex-col items-center md:items-start rounded-xl bg-background/50 p-3 md:p-0 md:bg-transparent border md:border-none border-border/50">
                      <span className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> 팔로워</span>
                      <span className="text-xl md:text-2xl font-bold"><NumberTicker value={star.followerCount} />명</span>
                    </div>
                    <div className="flex flex-col items-center md:items-start rounded-xl bg-background/50 p-3 md:p-0 md:bg-transparent border md:border-none border-border/50">
                      <span className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Eye className="h-3 w-3" /> 조회</span>
                      <span className="text-xl md:text-2xl font-bold"><NumberTicker value={star.totalViews} />회</span>
                    </div>
                    <div className="flex flex-col items-center md:items-start rounded-xl bg-background/50 p-3 md:p-0 md:bg-transparent border md:border-none border-border/50">
                      <span className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1"><Heart className="h-3 w-3" /> 좋아요</span>
                      <span className="text-xl md:text-2xl font-bold"><NumberTicker value={star.totalLikes} />개</span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 pt-2">
                    {star.showreel && (
                      <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                        <a href={star.showreel} target="_blank" rel="noopener noreferrer">
                          <Play className="mr-2 h-4 w-4 fill-current" /> Watch Showreel
                        </a>
                      </Button>
                    )}
                    {star.website && (
                      <Button asChild variant="outline" size="lg" className="rounded-full">
                        <a href={star.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-2 h-4 w-4" /> Website
                        </a>
                      </Button>
                    )}
                    {star.socialLinks && typeof star.socialLinks === "object" &&
                      Object.entries(star.socialLinks).map(([platform, url]) => {
                        if (!url) return null;
                        const isYoutube = platform.toLowerCase().includes("youtube");
                        const isInstagram = platform.toLowerCase().includes("instagram");
                        return (
                          <Button key={platform} asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                            <a href={url as string} target="_blank" rel="noopener noreferrer" title={platform}>
                              {isYoutube ? <Youtube className="h-5 w-5" /> : isInstagram ? <Instagram className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                            </a>
                          </Button>
                        );
                      })
                    }
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={handleShare}>
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Mobile Share Button */}
                  <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
                    <Button size="lg" className="w-full rounded-full shadow-lg" onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" /> 프로필 공유
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tabs Navigation ─── */}
      {star && (
        <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 md:px-6">
            <div className="flex overflow-x-auto hide-scrollbar">
              <div className="flex space-x-1 py-3 md:py-4">
                <button
                  onClick={() => setActiveTab("featured")}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "featured" ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  대표 작업
                  {activeTab === "featured" && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 -z-10 rounded-full bg-muted" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("portfolio")}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "portfolio" ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  포트폴리오
                  {activeTab === "portfolio" && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 -z-10 rounded-full bg-muted" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("all")}
                  className={`relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "all" ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  전체 영상
                  {activeTab === "all" && (
                    <motion.div layoutId="activeTab" className="absolute inset-0 -z-10 rounded-full bg-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Works Section ─── */}
      <div className="mx-auto max-w-7xl space-y-16 md:space-y-32 px-4 md:px-6 py-12 md:py-24">
        {isLoading ? (
          /* 콘텐츠 영역만 스켈레톤 */
          <section>
            <div className="mb-8 md:mb-12 flex items-end justify-between border-b pb-4 md:pb-6">
              <Skeleton className="h-8 md:h-9 w-40 md:w-48" />
              <Skeleton className="h-4 md:h-5 w-24 md:w-28" />
            </div>
            <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={`feat-skel-${i}`} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="h-6 md:h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </section>
        ) : star ? (
          <>
            {/* Latest Videos (Featured Layout) */}
            {(activeTab === "featured" || activeTab === "all") && featuredVideos.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mb-8 md:mb-12 flex items-end justify-between border-b pb-4 md:pb-6">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">대표 작업</h2>
                  <span className="text-xs md:text-sm font-medium text-muted-foreground">
                    Latest Releases
                  </span>
                </div>
                
                <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
                  {featuredVideos.map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group block space-y-3 md:space-y-4">
                      <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-violet-500/10">
                        {video.thumbnailUrl || video.streamUid ? (
                          <Image
                            src={video.streamUid 
                              ? `https://videodelivery.net/${video.streamUid}/thumbnails/thumbnail.jpg?width=1280`
                              : video.thumbnailUrl!}
                            alt={video.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            unoptimized
                          />
                         ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Tv className="h-10 w-10 md:h-12 md:w-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform duration-300 group-hover:scale-110">
                            <Play className="ml-1 h-5 w-5 md:h-6 md:w-6 fill-current" />
                          </div>
                        </div>
                        
                        {/* Duration Badge */}
                        {video.technicalSpec?.duration && (
                          <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 rounded-md bg-black/80 px-2 py-1 text-[10px] md:text-xs font-medium text-white backdrop-blur-md">
                            {Math.floor(video.technicalSpec.duration / 60)}:
                            {String(Math.floor(video.technicalSpec.duration % 60)).padStart(2, "0")}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold leading-tight transition-colors group-hover:text-violet-600">
                          {video.title}
                        </h3>
                        <div className="mt-1 flex w-full items-center justify-between text-xs md:text-sm text-muted-foreground">
                          <span>{video.category?.name}</span>
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Portfolio Items */}
            {(activeTab === "portfolio" || activeTab === "all") && star.portfolioItems.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                 <div className="mb-8 md:mb-12 flex items-end justify-between border-b pb-4 md:pb-6">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">포트폴리오</h2>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                  {star.portfolioItems.map((item) => (
                    <div key={item.id} className="group space-y-2 md:space-y-3">
                      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-muted transition-all duration-500 group-hover:shadow-lg">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <span className="text-3xl md:text-4xl opacity-20">🎨</span>
                          </div>
                        )}
                        {item.videoUrl && (
                          <a 
                            href={item.videoUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                             <ExternalLink className="h-6 w-6 md:h-8 md:w-8 text-white" />
                          </a>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm md:text-base font-bold leading-snug">{item.title}</h4>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-[10px] md:text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Other Videos */}
            {(activeTab === "all") && otherVideos.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                 <div className="mb-8 md:mb-12 flex items-end justify-between border-b pb-4 md:pb-6">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">전체 영상</h2>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                  {otherVideos.map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group space-y-2 md:space-y-3">
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted transition-all duration-500 group-hover:shadow-lg">
                        {video.thumbnailUrl || video.streamUid ? (
                          <Image
                            src={video.streamUid 
                              ? `https://videodelivery.net/${video.streamUid}/thumbnails/thumbnail.jpg`
                              : video.thumbnailUrl!}
                            alt={video.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            unoptimized
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                        <Play className="absolute left-1/2 top-1/2 h-6 w-6 md:h-8 md:w-8 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div>
                        <h4 className="text-sm md:text-base font-bold leading-snug transition-colors group-hover:text-violet-600">
                          {video.title}
                        </h4>
                        <p className="mt-1 text-[10px] md:text-xs text-muted-foreground">
                          {new Date(video.createdAt).getFullYear()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="h-[50vh] animate-pulse bg-muted/30" />
      <div className="relative z-10 mx-auto -mt-24 max-w-7xl px-6">
        <Skeleton className="h-56 w-56 rounded-[2.5rem]" />
        <div className="mt-8 max-w-xl space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-bold">Star Not Found</h2>
      <p className="mt-2 text-muted-foreground">The creator you are looking for does not exist.</p>
      <Button onClick={() => router.push("/stars")} className="mt-6">
        Back to Stars
      </Button>
    </div>
  );
}
