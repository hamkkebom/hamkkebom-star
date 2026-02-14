"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";
import { MoreVertical, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

/** 썸네일 이미지 with onError fallback */
function ThumbnailImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <title>영상 없음</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      onError={() => setFailed(true)}
    />
  );
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "삭제에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("영상이 성공적으로 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    let items = [...data.data];
    // 최근 제출일 순 정렬
    items.sort((a, b) => {
      const dateA = new Date(a.submittedAt || a.createdAt).getTime();
      const dateB = new Date(b.submittedAt || b.createdAt).getTime();
      return dateB - dateA;
    });
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
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === f.value
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
            <div
              key={submission.id}
              onClick={() => router.push(`/stars/my-videos/${submission.id}`)}
              className="group block h-full cursor-pointer"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-md">
                {/* 썸네일 */}
                <div className="relative aspect-video w-full bg-muted">
                  <ThumbnailImage
                    src={submission.signedThumbnailUrl}
                    alt={submission.versionTitle || "영상 썸네일"}
                  />
                  <Badge
                    variant={statusMap[submission.status]?.variant ?? "secondary"}
                    className="absolute top-2 right-2 shadow-sm"
                  >
                    {statusMap[submission.status]?.label ?? submission.status}
                  </Badge>
                </div>
                <CardHeader className="gap-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-sm">
                      {cleanVersionTitle(submission.versionTitle) ??
                        submission?.assignment?.request?.title ??
                        `제출물 ${submission.version}`}
                    </CardTitle>
                    {/* 대기중일 때만 삭제 메뉴 표시 */}
                    {submission.status === "PENDING" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                            <span className="sr-only">메뉴 열기</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(submission.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>삭제하기</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <CardDescription className="line-clamp-1 text-xs">
                    {(() => {
                      const parts: string[] = [];
                      if (submission?.assignment?.request?.title)
                        parts.push(submission.assignment.request.title);
                      parts.push(
                        `버전 ${submission.version.startsWith("v")
                          ? submission.version
                          : `v${submission.version}`
                        }`
                      );
                      if (submission.duration)
                        parts.push(formatDuration(submission.duration));
                      return parts.join(" · ");
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between px-3 pb-3 pt-0 text-xs text-muted-foreground">
                  <span>
                    제출 {formatDate(submission.submittedAt || submission.createdAt)}
                  </span>
                  {submission._count.feedbacks > 0 && (
                    <span className="font-medium text-primary">
                      피드백 {submission._count.feedbacks}건
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              영상을 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없으며, 영상 데이터와 관련된 모든 기록이 영구적으로
              삭제됩니다.
              <br />
              <br />
              <span className="font-medium text-foreground">
                정말 삭제하시겠습니까?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) deleteMutation.mutate(deleteId);
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제하기"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
