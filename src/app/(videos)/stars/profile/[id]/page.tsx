"use client";
export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Play,
  Share2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
};

export default function StarProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<{ data: StarDetail }>({
    queryKey: ["star-profile", id],
    queryFn: () => fetch(`/api/stars/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  if (!isLoading && (error || !data?.data)) return <NotFoundState />;

  const star = data?.data ?? null;

  // Split videos into featured (latest 2) and others
  const featuredVideos = star?.videos.slice(0, 2) ?? [];
  const otherVideos = star?.videos.slice(2) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Immersive Header ─── */}
      <section className="relative flex min-h-[50vh] flex-col justify-end border-b bg-muted/30 pb-16 pt-32 dark:bg-muted/5">
        {/* Background Accents — 항상 즉시 표시 */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-[20%] right-[10%] h-[600px] w-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
          <div className="absolute -left-[10%] top-[40%] h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-6">
          {/* 뒤로가기 — 항상 즉시 표시 */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="absolute left-6 top-8 gap-2 text-muted-foreground hover:text-foreground md:left-12 md:top-12"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Stars
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-end md:gap-12">
            {/* Large Avatar */}
            <div className="relative mb-8 shrink-0 md:mb-0">
              <div className="h-40 w-40 overflow-hidden rounded-[2.5rem] bg-background shadow-2xl ring-8 ring-background dark:ring-white/5 md:h-56 md:w-56">
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
                  <div className="flex h-full w-full items-center justify-center bg-muted text-6xl font-black text-muted-foreground/30">
                    {star?.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-6">
              {isLoading ? (
                <>
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-16 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-full max-w-md" />
                  <Skeleton className="h-6 w-1/2 max-w-xs" />
                </>
              ) : star ? (
                <>
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                        STAR CREATOR
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">
                        Joined {new Date(star.createdAt).getFullYear()}
                      </span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
                      {star.name}
                    </h1>
                  </div>

                  {/* Bio */}
                  <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                    {star.bio || "영상으로 세상을 연결하는 크리에이터입니다."}
                  </p>

                  {/* Links */}
                  <div className="flex flex-wrap gap-4 pt-2">
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
                      Object.entries(star.socialLinks).map(([platform, url]) => (
                        <Button key={platform} asChild variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                          <a href={url as string} target="_blank" rel="noopener noreferrer" title={platform}>
                            <ExternalLink className="h-5 w-5" />
                          </a>
                        </Button>
                      ))
                    }
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Works Section ─── */}
      <div className="mx-auto max-w-7xl space-y-32 px-6 py-24">
        {isLoading ? (
          /* 콘텐츠 영역만 스켈레톤 */
          <section>
            <div className="mb-12 flex items-end justify-between border-b pb-6">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={`feat-skel-${i}`} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </section>
        ) : star ? (
          <>
            {/* Latest Videos (Featured Layout) */}
            {featuredVideos.length > 0 && (
              <section>
                <div className="mb-12 flex items-end justify-between border-b pb-6">
                  <h2 className="text-3xl font-bold tracking-tight">Featured Works</h2>
                  <span className="text-sm font-medium text-muted-foreground">
                    Latest Releases
                  </span>
                </div>
                
                <div className="grid gap-8 lg:grid-cols-2">
                  {featuredVideos.map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group block space-y-4">
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
                            <Tv className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition-transform duration-300 group-hover:scale-110">
                            <Play className="ml-1 h-6 w-6 fill-current" />
                          </div>
                        </div>
                        
                        {/* Duration Badge */}
                        {video.technicalSpec?.duration && (
                          <div className="absolute bottom-4 right-4 rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
                            {Math.floor(video.technicalSpec.duration / 60)}:
                            {String(Math.floor(video.technicalSpec.duration % 60)).padStart(2, "0")}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-bold leading-tight transition-colors group-hover:text-violet-600">
                          {video.title}
                        </h3>
                        <div className="mt-1 flex w-full items-center justify-between text-sm text-muted-foreground">
                          <span>{video.category?.name}</span>
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Portfolio / More Videos */}
            {(star.portfolioItems.length > 0 || otherVideos.length > 0) && (
              <section>
                 <div className="mb-12 flex items-end justify-between border-b pb-6">
                  <h2 className="text-3xl font-bold tracking-tight">Portfolio & Archive</h2>
                </div>

                <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {/* Portfolio Items */}
                  {star.portfolioItems.map((item) => (
                    <div key={item.id} className="group space-y-3">
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
                            <span className="text-4xl opacity-20">🎨</span>
                          </div>
                        )}
                        {item.videoUrl && (
                          <a 
                            href={item.videoUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                             <ExternalLink className="h-8 w-8 text-white" />
                          </a>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold leading-snug">{item.title}</h4>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Other Videos */}
                  {otherVideos.map((video) => (
                    <Link key={video.id} href={`/videos/${video.id}`} className="group space-y-3">
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
                        <Play className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div>
                        <h4 className="font-bold leading-snug transition-colors group-hover:text-violet-600">
                          {video.title}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(video.createdAt).getFullYear()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
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
