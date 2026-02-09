"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

type Feedback = {
  id: string;
  type: string;
  priority: string;
  status: string;
  content: string;
  startTime: number | null;
  endTime: number | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
};

type SubmissionDetail = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string | null;
  status: string;
  summaryFeedback: string | null;
  createdAt: string;
  star: { id: string; name: string; email: string; avatarUrl: string | null };
  assignment: {
    request: { id: string; title: string; deadline: string };
  } | null;
  video: { id: string; title: string } | null;
  feedbacks: Feedback[];
  _count: { feedbacks: number };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  IN_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REVISED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusLabels: Record<string, string> = {
  PENDING: "대기",
  IN_REVIEW: "검수중",
  APPROVED: "승인",
  REJECTED: "반려",
  REVISED: "수정요청",
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data, isLoading, error } = useQuery<{ data: SubmissionDetail }>({
    queryKey: ["submission-detail", id],
    queryFn: () => fetch(`/api/submissions/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/submissions/${id}/approve`, { method: "PATCH" }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error?.message || "승인 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("제출물이 승인되었습니다!");
      queryClient.invalidateQueries({ queryKey: ["submission-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error?.message || "반려 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("제출물이 반려되었습니다.");
      setShowRejectForm(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["submission-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">제출물을 찾을 수 없습니다.</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로가기
        </Button>
      </div>
    );
  }

  const sub = data.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {sub.versionTitle || `v${sub.version}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sub.star.name} · {sub.assignment?.request.title || "직접 제출"}
          </p>
        </div>
        <Badge className={statusColors[sub.status] || ""}>
          {statusLabels[sub.status] || sub.status}
        </Badge>
      </div>

      {/* Video Player */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          {sub.streamUid ? (
            <VideoPlayer src={`https://customer-${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH || ""}.cloudflarestream.com/${sub.streamUid}/manifest/video.m3u8`} />
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted">
              <p className="text-muted-foreground">영상이 등록되지 않았습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject Controls */}
      {(sub.status === "PENDING" || sub.status === "IN_REVIEW") && (
        <div className="flex gap-3">
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {approveMutation.isPending ? "승인 중..." : "승인"}
          </Button>
          <Button
            onClick={() => setShowRejectForm(!showRejectForm)}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="mr-2 h-4 w-4" />
            반려
          </Button>
        </div>
      )}

      {/* Reject Reason Form */}
      {showRejectForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">반려 사유</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              rows={3}
            />
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="destructive"
              className="w-full"
            >
              {rejectMutation.isPending ? "반려 처리 중..." : "반려 확인"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Feedback */}
      {sub.summaryFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">요약 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{sub.summaryFeedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            타임코드 피드백 ({sub._count.feedbacks})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FeedbackForm submissionId={sub.id} />
          <FeedbackList submissionId={sub.id} />
        </CardContent>
      </Card>
    </div>
  );
}
