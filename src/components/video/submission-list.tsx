"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";

type SubmissionRow = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string;
  status: SubmissionStatus;
  createdAt: string;
  submittedAt: string | null;
  duration: number | null;
  signedThumbnailUrl: string | null;
  video: {
    streamUid: string | null;
  } | null;
  assignment: {
    request: {
      id: string;
      title: string;
    };
  } | null;
  _count: {
    feedbacks: number;
  };
};

type MySubmissionsResponse = {
  data: SubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const statusMap: Record<SubmissionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기중", variant: "secondary" },
  IN_REVIEW: { label: "리뷰중", variant: "default" },
  APPROVED: { label: "승인됨", variant: "outline" },
  REJECTED: { label: "반려됨", variant: "destructive" },
  REVISED: { label: "수정됨", variant: "secondary" },
};

const statusFilters: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기중" },
  { value: "IN_REVIEW", label: "리뷰중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "REJECTED", label: "반려됨" },
  { value: "REVISED", label: "수정됨" },
];

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) return `${mins}분 ${secs}초`;
  return `${secs}초`;
}

/** versionTitle이 해시/파일명처럼 보이면 null 반환 */
function cleanVersionTitle(title: string | null): string | null {
  if (!title) return null;
  // 해시 패턴 (hf_20260130_..., uuid 등) 감지
  if (/^[a-f0-9-]{20,}$/i.test(title) || /^hf_\d+/.test(title)) return null;
  return title;
}

async function fetchMySubmissions(): Promise<MySubmissionsResponse> {
  const response = await fetch("/api/submissions/my?page=1&pageSize=50", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("제출물 목록을 불러오지 못했습니다.");
  }

  return (await response.json()) as MySubmissionsResponse;
}

function SubmissionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

export function SubmissionList({ limit }: { limit?: number } = {}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    let items = data.data;
    if (statusFilter !== "ALL") {
      items = items.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (s) =>
          (s.versionTitle ?? "").toLowerCase().includes(q) ||
          (s.assignment?.request?.title ?? "").toLowerCase().includes(q)
      );
    }
    if (limit) {
      items = items.slice(0, limit);
    }
    return items;
  }, [data, search, statusFilter, limit]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SubmissionCardSkeleton key={`submission-skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "제출물 목록을 불러오지 못했습니다."}
      </div>
    );
  }

  if (!data?.data.length) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-14 text-center">
        <h3 className="mb-1 text-lg font-semibold">제출물이 없습니다</h3>
        <p className="text-sm text-muted-foreground">영상을 업로드하여 첫 제출물을 등록해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색/필터 (전체 목록일 때만 표시) */}
      {!limit && (
        <div className="space-y-3">
          <Input
            placeholder="영상 제목 또는 프로젝트명으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">조건에 맞는 제출물이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredData.map((submission) => (
            <Link key={submission.id} href={`/stars/my-videos/${submission.id}`} className="block">
              <Card className="transition-colors hover:border-primary/40 cursor-pointer h-full overflow-hidden">
                {/* 썸네일 */}
                <div className="relative aspect-video w-full bg-muted">
                  {submission.signedThumbnailUrl ? (
                    <Image
                      src={submission.signedThumbnailUrl}
                      alt={submission.versionTitle || "영상 썸네일"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  )}
                  <Badge
                    variant={statusMap[submission.status]?.variant ?? "secondary"}
                    className="absolute top-2 right-2"
                  >
                    {statusMap[submission.status]?.label ?? submission.status}
                  </Badge>
                </div>
                <CardHeader className="gap-1 p-3">
                  <CardTitle className="line-clamp-1 text-sm">
                    {submission?.assignment?.request?.title ?? '프로젝트 미지정'}
                  </CardTitle>
                  <CardDescription className="line-clamp-1 text-xs">
                    {(() => {
                      const clean = cleanVersionTitle(submission.versionTitle);
                      const parts: string[] = [`버전 ${submission.version}`];
                      if (clean) parts.push(clean);
                      if (submission.duration) parts.push(formatDuration(submission.duration));
                      return parts.join(' · ');
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-3 pb-3 pt-0 text-xs text-muted-foreground">
                  <span>제출 {formatDate(submission.submittedAt || submission.createdAt)}</span>
                  {submission._count.feedbacks > 0 && (
                    <span className="font-medium text-primary">피드백 {submission._count.feedbacks}건</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
