"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

export function SubmissionList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

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
    <div className="grid gap-4 md:grid-cols-2">
      {data.data.map((submission) => (
        <Card key={submission.id} className="transition-colors hover:border-primary/40">
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="line-clamp-1 text-base">
                {submission.versionTitle || `슬롯 ${submission.versionSlot} v${submission.version}`}
              </CardTitle>
              <Badge variant={statusMap[submission.status]?.variant ?? "secondary"}>
                {statusMap[submission.status]?.label ?? submission.status}
              </Badge>
            </div>
            <CardDescription className="line-clamp-1">
              {submission?.assignment?.request?.title ?? '제목 없음'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
            <span>v{submission.version} • 슬롯 {submission.versionSlot}</span>
            <span>
              피드백 {submission._count.feedbacks}개 • {formatDate(submission.createdAt)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
