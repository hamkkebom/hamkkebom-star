"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { VideoCard } from "@/components/video/video-card";

export default function CounselorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["counselor", id],
    queryFn: async () => {
      const res = await fetch(`/api/counselors/${id}`);
      if (!res.ok) throw new Error("Failed to fetch counselor");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-24 mb-8" />
        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <EmptyState
          title="전문가를 찾을 수 없습니다"
          description="존재하지 않거나 비활성화된 전문가입니다."
          action={
            <Button onClick={() => router.push("/counselors")}>
              목록으로 돌아가기
            </Button>
          }
        />
      </div>
    );
  }

  const { counselor, videos, totalVideos } = data.data;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:py-12">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6 -ml-3 text-muted-foreground"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        목록으로
      </Button>

      <div className="grid gap-8 md:grid-cols-[320px_1fr] lg:grid-cols-[380px_1fr]">
        {/* Left Column: Profile */}
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5" />
            <div className="px-6 pb-6">
              <div className="-mt-12 mb-4 flex justify-center">
                <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                  <AvatarImage src={counselor.imageUrl || ""} alt={counselor.displayName} />
                  <AvatarFallback className="text-2xl">{counselor.displayName.slice(0, 2)}</AvatarFallback>
                </Avatar>
              </div>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold">{counselor.displayName}</h1>
                {counselor.category && (
                  <Badge variant="secondary" className="mt-2">
                    {counselor.category}
                  </Badge>
                )}
              </div>

              {counselor.specialties && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">전문 분야</h3>
                  <p className="text-sm">{counselor.specialties}</p>
                </div>
              )}

              {counselor.hashtags && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {counselor.hashtags.split(",").map((tag: string) => (
                    <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {counselor.landingPageUrl && (
                <Button className="mt-6 w-full" asChild>
                  <a href={counselor.landingPageUrl} target="_blank" rel="noopener noreferrer">
                    상담 예약하기
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {counselor.career && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="font-semibold mb-4">주요 경력</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                {counselor.career}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Content */}
        <div className="flex flex-col gap-8">
          {counselor.introduction && (
            <section>
              <h2 className="text-xl font-bold mb-4">전문가 소개</h2>
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {counselor.introduction}
                </div>
              </div>
            </section>
          )}

          {counselor.announcements && (
            <section>
              <h2 className="text-xl font-bold mb-4">공지사항</h2>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {counselor.announcements}
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                이 전문가의 영상
                <span className="text-muted-foreground text-base font-normal ml-1">
                  ({totalVideos})
                </span>
              </h2>
            </div>

            {videos.length === 0 ? (
              <EmptyState
                title="등록된 영상이 없습니다"
                description="아직 이 전문가가 참여한 영상이 없습니다."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video: any) => (
                  <VideoCard
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    thumbnailUrl={video.thumbnailUrl}
                    streamUid={video.streamUid}
                    duration={null}
                    ownerName={video.owner?.name || "알 수 없음"}
                    categoryName={counselor.category}
                    createdAt={video.createdAt}
                    viewCount={video.viewCount}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
