"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED";

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
    email: string;
  };
  assignment: {
    request: {
      id: string;
      title: string;
    };
  };
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
  IN_REVIEW: "리뷰중",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  REVISION_REQUESTED: "수정요청",
};

const statusVariants: Record<SubmissionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  IN_REVIEW: "default",
  APPROVED: "outline",
  REJECTED: "destructive",
  REVISION_REQUESTED: "destructive",
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

async function fetchAllSubmissions(): Promise<SubmissionsResponse> {
  const res = await fetch("/api/submissions?page=1&pageSize=50", { cache: "no-store" });
  if (!res.ok) throw new Error("제출물 목록을 불러오지 못했습니다.");
  return (await res.json()) as SubmissionsResponse;
}

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: fetchAllSubmissions,
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
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "관리자 반려" }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "반려에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("제출물이 반려되었습니다.");
      setSelectedSubmission(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "반려에 실패했습니다.");
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">영상 리뷰</h1>
        <p className="text-sm text-muted-foreground">
          제출된 영상을 리뷰하고 피드백을 작성하세요.
        </p>
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
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {row?.assignment?.request?.title ?? '제목 없음'}
                      </TableCell>
                      <TableCell>{row.star.name}</TableCell>
                      <TableCell>
                        {row.versionTitle || `v${row.version}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[row.status]}>
                          {statusLabels[row.status]}
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                  {selectedSubmission?.assignment?.request?.title ?? '제목 없음'} — {selectedSubmission.versionTitle || `v${selectedSubmission.version}`}
                </DialogTitle>
                <DialogDescription>
                  {selectedSubmission.star.name} ({selectedSubmission.star.email})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <VideoPlayer
                  src={`https://videodelivery.net/${selectedSubmission.streamUid}/manifest/video.m3u8`}
                  onTimeUpdate={setCurrentTime}
                  seekTo={seekTo}
                />

                <div className="flex gap-2">
                  <Button
                    onClick={() => approveMutation.mutate(selectedSubmission.id)}
                    disabled={
                      approveMutation.isPending ||
                      selectedSubmission.status === "APPROVED"
                    }
                  >
                    {approveMutation.isPending ? "승인 중..." : "승인"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(selectedSubmission.id)}
                    disabled={
                      rejectMutation.isPending ||
                      selectedSubmission.status === "REJECTED"
                    }
                  >
                    {rejectMutation.isPending ? "반려 중..." : "반려"}
                  </Button>
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
