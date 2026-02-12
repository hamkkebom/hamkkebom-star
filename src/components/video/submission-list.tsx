"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    <Card>
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
  const cfHash = process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || "";

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
      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="grid gap-4 md:grid-cols-2">
          {filteredData.map((submission) => (
            <Link key={submission.id} href={`/stars/my-videos/${submission.id}`} className="block">
              <Card className="transition-colors hover:border-primary/40 cursor-pointer h-full overflow-hidden">
                {/* 썸네일 */}
                {cfHash && submission.streamUid && (
                  <div className="relative aspect-video w-full bg-muted">
                    <img
                      src={`https://customer-${cfHash}.cloudflarestream.com/${submission.streamUid}/thumbnails/thumbnail.jpg?time=1s&width=640`}
                      alt={submission.versionTitle || "영상 러닝타임"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <Badge
                      variant={statusMap[submission.status]?.variant ?? "secondary"}
                      className="absolute top-2 right-2"
                    >
                      {statusMap[submission.status]?.label ?? submission.status}
                    </Badge>
                  </div>
                )}
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base">
                      {submission.versionTitle || `v${submission.version}`}
                    </CardTitle>
                    {/* 썸네일이 없을 경우만 헤더에 뱃지 표시 */}
                    {(!cfHash || !submission.streamUid) && (
                      <Badge variant={statusMap[submission.status]?.variant ?? "secondary"}>
                        {statusMap[submission.status]?.label ?? submission.status}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-1">
                    {submission?.assignment?.request?.title ?? '제목 없음'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatDate(submission.createdAt)}</span>
                  {submission._count.feedbacks > 0 && (
                    <span>피드백 {submission._count.feedbacks}개</span>
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
