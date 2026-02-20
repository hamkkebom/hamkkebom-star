"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { toast } from "sonner";
import { type LucideIcon, MoreVertical, Trash2, AlertTriangle, Loader2, PlayCircle, CheckCircle2, Film, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

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
  thumbnailUrl?: string | null;
  video: {
    title: string | null;
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

const statusMap: Record<SubmissionStatus, { label: string; className: string; icon: LucideIcon }> = {
  PENDING: {
    label: "대기중",
    className: "bg-slate-500/90 text-white border-slate-400/20 ring-1 ring-slate-500/50 shadow-[0_0_10px_rgba(100,116,139,0.3)]",
    icon: Loader2
  },
  IN_REVIEW: {
    label: "피드백중",
    className: "bg-violet-600 text-white border-violet-400/20 ring-1 ring-violet-500/50 shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-pulse-subtle",
    icon: PlayCircle
  },
  APPROVED: {
    label: "승인됨",
    className: "bg-emerald-500 text-white border-emerald-400/20 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
    icon: CheckCircle2
  },
  REJECTED: {
    label: "반려됨",
    className: "bg-rose-500 text-white border-rose-400/20 ring-1 ring-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]",
    icon: AlertTriangle
  },
  REVISED: {
    label: "수정됨",
    className: "bg-blue-500 text-white border-blue-400/20 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)]",
    icon: MoreVertical
  },
};

const statusFilters: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기중" },
  { value: "IN_REVIEW", label: "피드백중" },
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
            {statusFilters.map((f) => {
              const isActive = statusFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-accent"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Film className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">제출물이 없습니다</h3>
          <p className="text-muted-foreground mt-1 max-w-sm mb-6">
            아직 업로드한 영상이 없습니다. <br />새로운 프로젝트를 시작해보세요!
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredData.map((submission) => (
            <div
              key={submission.id}
              onClick={() => router.push(`/stars/my-videos/${submission.id}`)}
              className="group relative cursor-pointer flex flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              {/* 썸네일 영역 */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {/* 썸네일 이미지 or Fallback */}
                {submission.signedThumbnailUrl ? (
                  <Image
                    src={submission.signedThumbnailUrl}
                    alt={submission.versionTitle || "영상 썸네일"}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 flex items-center justify-center group-hover:from-indigo-500/10 group-hover:to-pink-500/10 transition-colors">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                  </div>
                )}

                {/* 상태 배지 (좌측 상단 - High Visibility) */}
                <div className="absolute top-3 left-3 z-10">
                  {(() => {
                    const statusInfo = statusMap[submission.status] || {
                      label: submission.status,
                      className: "bg-secondary text-secondary-foreground",
                      icon: null
                    };
                    const StatusIcon = statusInfo.icon;

                    return (
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 backdrop-blur-md shadow-lg",
                        statusInfo.className
                      )}>
                        {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                        {statusInfo.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Play Overlay Button */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="bg-white/20 backdrop-blur-md text-white rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform">
                    <PlayCircle className="w-8 h-8 fill-white/20" />
                  </div>
                </div>

                {/* 삭제 메뉴 (우측 상단 - 대기중일 때만) */}
                {submission.status === "PENDING" && (
                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white"
                        >
                          <MoreVertical className="h-4 w-4" />
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
                  </div>
                )}

                {/* 영상 길이 (우측 하단) */}
                {submission.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    {formatDuration(submission.duration)}
                  </div>
                )}
              </div>

              {/* 정보 영역 */}
              <div className="flex flex-col flex-1 p-4">
                <h3 className="font-bold text-base leading-snug mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {cleanVersionTitle(submission.versionTitle) ??
                    submission?.assignment?.request?.title ??
                    submission?.video?.title ??
                    `제출물 ${submission.version}`}
                </h3>

                <div className="text-xs text-muted-foreground mb-4 line-clamp-1">
                  {submission?.assignment?.request?.title || "프로젝트명 없음"}
                </div>

                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-muted-foreground/30">
                      {submission.version.startsWith("v") ? submission.version : `v${submission.version}`}
                    </Badge>
                    <span>{formatDate(submission.submittedAt || submission.createdAt)}</span>
                  </div>
                  {submission._count.feedbacks > 0 && (
                    <span className="flex items-center gap-1 font-medium text-indigo-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      피드백 {submission._count.feedbacks}
                    </span>
                  )}
                </div>
              </div>
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
