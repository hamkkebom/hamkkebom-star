"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MySubmission = {
  id: string;
  versionTitle: string | null;
  version: string;
  signedThumbnailUrl: string | null;
  assignment: {
    request: {
      title: string;
    };
  };
  _count: {
    feedbacks: number;
  };
};

async function fetchMySubmissionsWithFeedback(): Promise<MySubmission[]> {
  const res = await fetch("/api/submissions/my?page=1&pageSize=50", { cache: "no-store" });
  if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
  const json = (await res.json()) as { data: MySubmission[] };
  return json.data;
}

export default function FeedbackPage() {
  const { data: submissions, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions-feedback"],
    queryFn: fetchMySubmissionsWithFeedback,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">피드백 확인</h1>
        <p className="text-sm text-muted-foreground">
          제출한 영상에 대한 피드백을 확인하세요.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={`fb-skeleton-${i}`} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "피드백을 불러오지 못했습니다."}
        </div>
      ) : !submissions?.length ? (
        <div className="rounded-xl border border-dashed px-4 py-14 text-center">
          <h3 className="mb-1 text-lg font-semibold">제출물이 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            먼저 영상을 업로드하여 제출물을 등록해 주세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {submissions.map((sub) => (
            <Link key={sub.id} href={`/stars/my-videos/${sub.id}`} className="block">
              <Card className="transition-colors hover:border-primary/40 cursor-pointer h-full overflow-hidden">
                {/* 썸네일 */}
                <div className="relative aspect-video w-full bg-muted">
                  {sub.signedThumbnailUrl ? (
                    <Image
                      src={sub.signedThumbnailUrl}
                      alt={sub.versionTitle || "영상 썸네일"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                  {sub._count.feedbacks > 0 && (
                    <Badge variant="default" className="absolute top-2 right-2">
                      피드백 {sub._count.feedbacks}개
                    </Badge>
                  )}
                </div>
                <CardHeader className="gap-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {sub.versionTitle || `v${sub.version}`}
                  </CardTitle>
                  <CardDescription className="line-clamp-1">
                    {sub?.assignment?.request?.title ?? '제목 없음'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


