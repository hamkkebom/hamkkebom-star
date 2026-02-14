"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackList } from "@/components/feedback/feedback-list";

type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";

type SubmissionDetail = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string | null;
  status: SubmissionStatus;
  summaryFeedback: string | null;
  duration: number | null;
  createdAt: string;
  assignment: {
    request: {
      id: string;
      title: string;
      deadline: string;
    };
  } | null;
  video: {
    id: string;
    title: string;
    streamUid: string | null;
  } | null;
  _count: {
    feedbacks: number;
  };
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

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}분 ${secs}초`;
}

async function fetchSubmission(id: string): Promise<SubmissionDetail> {
  const response = await fetch(`/api/submissions/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("제출물을 불러오지 못했습니다.");
  }
  const json = (await response.json()) as { data: SubmissionDetail };
  return json.data;
}

export function SubmissionDetailClient({ submissionId }: { submissionId: string }) {
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

  const { data: submission, isLoading, isError, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: () => fetchSubmission(submissionId),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
        {error instanceof Error ? error.message : "제출물을 불러오지 못했습니다."}
      </div>
    );
  }

  if (!submission) return null;

  // streamUid: submission 직접 → video 관계 순서로 fallback
  const streamUid = submission.streamUid || submission.video?.streamUid;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/stars/my-videos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {submission.versionTitle || (submission.version.startsWith("v") ? submission.version : `v${submission.version}`)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {submission.assignment?.request?.title ?? "프로젝트 정보 없음"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Badge variant={statusMap[submission.status]?.variant ?? "secondary"} className="text-sm px-3 py-1">
            {statusMap[submission.status]?.label ?? submission.status}
          </Badge>
          <Link
            href={`/stars/upload`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            수정본 업로드
          </Link>
        </div>
      </div>

      {/* 비디오 플레이어 — Cloudflare Stream iframe embed */}
      {streamUid ? (
        <VideoPlayer
          streamUid={streamUid}
          seekTo={seekTo}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <p className="text-sm">영상을 불러올 수 없습니다.</p>
        </div>
      )}

      {/* 상세 정보 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">버전</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{submission.version.startsWith("v") ? submission.version : `v${submission.version}`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">피드백</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{submission._count.feedbacks}개</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">제출일</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">{formatDate(submission.createdAt)}</p>
            {submission.duration && (
              <p className="text-xs text-muted-foreground">길이: {formatDuration(submission.duration)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 제작 설명/메모 */}
      {submission.summaryFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">제작 설명 / 메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {submission.summaryFeedback}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 피드백 목록 */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">피드백</h2>
        <FeedbackList
          submissionId={submission.id}
          onTimecodeClick={(time) => setSeekTo(time)}
        />
      </div>
    </div>
  );
}
