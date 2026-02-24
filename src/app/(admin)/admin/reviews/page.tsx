"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Clock, Eye, CheckCircle2, LayoutGrid, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";

type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";

type SubmissionRow = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string;
  status: SubmissionStatus;
  createdAt: string;
  star: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
  };
  assignment: {
    request: {
      id: string;
      title: string;
    };
  } | null;
  video: {
    title: string;
  } | null;
  _count: {
    feedbacks: number;
  };
};

type SubmissionsResponse = {
  data: SubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const statusLabels: Record<SubmissionStatus, string> = {
  PENDING: "대기중",
  IN_REVIEW: "피드백중",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  REVISED: "수정됨",
};

const statusVariants: Record<SubmissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  IN_REVIEW: "default",
  APPROVED: "outline",
  REJECTED: "destructive",
  REVISED: "secondary",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

async function fetchAllSubmissions(status: string, page: number): Promise<SubmissionsResponse> {
  const url = status === "ALL"
    ? `/api/submissions?page=${page}&pageSize=50`
    : `/api/submissions?page=${page}&pageSize=50&status=${status}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("제출물 목록을 불러오지 못했습니다.");
  return (await res.json()) as SubmissionsResponse;
}

const FILTERS = [
  { key: "PENDING", label: "대기중", icon: Clock },
  { key: "IN_REVIEW", label: "피드백중", icon: Eye },
  { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2 },
  { key: "ALL", label: "전체", icon: LayoutGrid },
];

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState("");
  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);

  const [isDownloading, setIsDownloading] = useState(false);

  const [filter, setFilter] = useState("PENDING");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-submissions", filter, page],
    queryFn: () => fetchAllSubmissions(filter, page),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/approve`, { method: "PATCH" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "승인에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("제출물이 승인되었습니다.");
      setSelectedSubmission(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "승인에 실패했습니다.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "관리자 반려" }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "반려에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("제출물이 반려되었습니다.");
      setSelectedSubmission(null);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "반려에 실패했습니다.");
    },
  });

  const cancelReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/cancel-review`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "상태 취소에 실패했습니다.");
      }
      return (await res.json()).data as SubmissionRow;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-submissions"] });
      const previousData = queryClient.getQueryData<SubmissionsResponse>(["admin-submissions", filter, page]);

      // Optimistic update for the list
      queryClient.setQueryData<SubmissionsResponse>(["admin-submissions", filter, page], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((sub) => {
            if (sub.id === id) {
              const newStatus = sub._count.feedbacks > 0 ? "IN_REVIEW" : "PENDING";
              return { ...sub, status: newStatus as SubmissionStatus };
            }
            return sub;
          }),
        };
      });

      // Optimistic update for the dialog
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => {
          if (!prev) return prev;
          const newStatus = prev._count.feedbacks > 0 ? "IN_REVIEW" : "PENDING";
          return { ...prev, status: newStatus as SubmissionStatus };
        });
      }

      return { previousData };
    },
    onSuccess: () => {
      toast.success("처리가 취소되었습니다.");
    },
    onError: (err, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["admin-submissions", filter, page], context.previousData);
      }
      toast.error(err instanceof Error ? err.message : "상태 취소에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">전체 피드백 관리</h1>
          <p className="text-sm text-muted-foreground">
            제출된 영상들을 부서 구분 없이 모두 확인하고 리뷰합니다.
          </p>
        </div>

        {/* Premium Filter Segments */}
        <div className="flex p-1 bg-slate-100/80 dark:bg-zinc-900/80 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-xl shadow-sm overflow-x-auto w-full sm:w-auto scrollbar-none">
          {FILTERS.map((tab) => {
            const isActive = filter === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-filter-bg"
                    className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? "opacity-100" : "opacity-70"}`} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "데이터를 불러오지 못했습니다."}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>STAR</TableHead>
                  <TableHead>버전</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>피드백</TableHead>
                  <TableHead>제출일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      제출된 영상이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const projectTitle = row.versionTitle || row.assignment?.request?.title || row.video?.title || `v${row.version.replace(/^v/i, "")}`;
                    const showSubtitle = row.assignment?.request?.title && row.versionTitle;

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[200px] font-medium">
                          <div className="truncate" title={projectTitle}>
                            {projectTitle}
                          </div>
                          {showSubtitle && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5" title={row.assignment!.request.title}>
                              {row.assignment!.request.title}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{row.star.chineseName || row.star.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs font-semibold bg-slate-50 dark:bg-slate-900">
                            v{row.version.replace(/^v/i, "")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[row.status] ?? "secondary"}>
                            {statusLabels[row.status] ?? row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{row._count.feedbacks}개</TableCell>
                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(row)}
                          >
                            리뷰
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 mb-8">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            총 <span className="text-slate-900 dark:text-slate-100">{data.total}</span>건 ({data.page} / {data.totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 hidden sm:flex"
            >
              이전
            </Button>

            {/* Page Numbers */}
            {Array.from({ length: 5 }, (_, i) => {
              const maxVisiblePages = 5;
              let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
              let endPage = startPage + maxVisiblePages - 1;

              if (endPage > data.totalPages) {
                endPage = data.totalPages;
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              const pageNum = startPage + i;
              if (pageNum > endPage) return null;

              const isActive = data.page === pageNum;

              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 p-0 ${isActive ? "pointer-events-none" : ""}`}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 hidden sm:flex"
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* 리뷰 다이얼로그 */}
      <Dialog
        open={Boolean(selectedSubmission)}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-5xl">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {(() => {
                    const title = selectedSubmission.versionTitle || selectedSubmission.assignment?.request?.title || selectedSubmission.video?.title || `v${selectedSubmission.version.replace(/^v/i, "")}`;
                    const subtitle = selectedSubmission.assignment?.request?.title && selectedSubmission.versionTitle ? selectedSubmission.assignment.request.title : null;
                    return subtitle ? `${title} — ${subtitle}` : `${title} — v${selectedSubmission.version.replace(/^v/i, "")}`;
                  })()}
                </DialogTitle>
                <DialogDescription>
                  {selectedSubmission.star.chineseName || selectedSubmission.star.name} ({selectedSubmission.star.email})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <VideoPlayer
                  streamUid={selectedSubmission.streamUid}
                  onTimeUpdate={handleTimeUpdate}
                  seekTo={seekTo}
                />

                <div className="flex gap-2 items-center">
                  {(selectedSubmission.status === "PENDING" ||
                    selectedSubmission.status === "IN_REVIEW" ||
                    selectedSubmission.status === "REVISED") && (
                      <>
                        <Button
                          onClick={() => approveMutation.mutate(selectedSubmission.id)}
                          disabled={approveMutation.isPending}
                        >
                          {approveMutation.isPending ? "승인 중..." : "승인"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => rejectMutation.mutate({ id: selectedSubmission.id, reason: rejectReason })}
                          disabled={rejectMutation.isPending || !rejectReason.trim()}
                        >
                          {rejectMutation.isPending ? "반려 중..." : "반려"}
                        </Button>
                      </>
                    )}

                  {(selectedSubmission.status === "APPROVED" ||
                    selectedSubmission.status === "REJECTED") && (
                      <Button
                        variant="secondary"
                        onClick={() => cancelReviewMutation.mutate(selectedSubmission.id)}
                        disabled={cancelReviewMutation.isPending}
                      >
                        {cancelReviewMutation.isPending
                          ? "취소 중..."
                          : selectedSubmission.status === "APPROVED"
                            ? "승인 취소"
                            : "반려 취소"}
                      </Button>
                    )}

                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsDownloading(true);
                      try {
                        const res = await fetch(`/api/submissions/${selectedSubmission.id}/download`);
                        if (!res.ok) {
                          const err = (await res.json()) as { error?: { message?: string } };
                          throw new Error(err.error?.message ?? "다운로드에 실패했습니다.");
                        }
                        const { data } = (await res.json()) as { data: { downloadUrl: string; filename: string } };
                        const a = document.createElement("a");
                        a.href = data.downloadUrl;
                        a.download = `${data.filename}.mp4`;
                        a.target = "_blank";
                        a.rel = "noopener noreferrer";
                        a.click();
                        toast.success("다운로드가 시작되었습니다.");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
                      } finally {
                        setIsDownloading(false);
                      }
                    }}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />다운로드 중...</>
                    ) : (
                      <><Download className="mr-2 h-4 w-4" />영상 다운로드</>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reject-reason" className="text-sm font-medium">반려 사유</label>
                  <textarea
                    id="reject-reason"
                    className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                    placeholder="반려 사유를 입력하세요..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">피드백 작성</CardTitle>
                    <CardDescription>현재 시점에 피드백을 남기세요.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FeedbackForm
                      submissionId={selectedSubmission.id}
                      currentTime={currentTime}
                      onSubmitted={() => {
                        queryClient.invalidateQueries({
                          queryKey: ["feedbacks", selectedSubmission.id],
                        });
                      }}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">피드백 목록</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FeedbackList
                      submissionId={selectedSubmission.id}
                      onTimecodeClick={setSeekTo}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
