"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackList } from "@/components/feedback/feedback-list";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  Edit3,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  thumbnailUrl: string | null;
  signedThumbnailUrl: string | null;
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
    thumbnailUrl: string | null;
    technicalSpec: { duration: number | null } | null;
  } | null;
  _count: {
    feedbacks: number;
  };
};

const statusMap: Record<SubmissionStatus, { label: string; className: string; icon: any; glowColor: string }> = {
  PENDING: {
    label: "대기중",
    className: "bg-slate-500/90 text-white border-slate-400/20 shadow-[0_0_10px_rgba(100,116,139,0.3)]",
    icon: Loader2,
    glowColor: "rgba(100,116,139,0.3)"
  },
  IN_REVIEW: {
    label: "리뷰중",
    className: "bg-violet-600 text-white border-violet-400/20 shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-pulse-subtle",
    icon: PlayCircle,
    glowColor: "rgba(124,58,237,0.6)"
  },
  APPROVED: {
    label: "승인됨",
    className: "bg-emerald-500 text-white border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
    icon: CheckCircle2,
    glowColor: "rgba(16,185,129,0.5)"
  },
  REJECTED: {
    label: "반려됨",
    className: "bg-rose-500 text-white border-rose-400/20 shadow-[0_0_15px_rgba(244,63,94,0.4)]",
    icon: AlertCircle,
    glowColor: "rgba(244,63,94,0.5)"
  },
  REVISED: {
    label: "수정됨",
    className: "bg-blue-500 text-white border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.4)]",
    icon: MoreVertical,
    glowColor: "rgba(59,130,246,0.5)"
  },
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

/** 썸네일 이미지 with onError fallback — 빈 src / 만료 URL 방어 */
function DetailThumbnail({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <span className="text-xs text-muted-foreground">썸네일 없음</span>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="relative w-full h-full block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 rounded-2xl">
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setFailed(true)}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <span className="flex items-center gap-2 text-white font-bold text-sm bg-black/50 px-3 py-1.5 rounded-full border border-white/20 hover:bg-black/70 hover:scale-105 transition-all">
              <Maximize2 className="w-4 h-4" />
              크게 보기
            </span>
          </div>
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white/90 uppercase tracking-wider">
            Thumbnail
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-none max-w-[90vw] max-h-[90vh] w-auto h-auto p-0 bg-transparent border-none shadow-none flex items-center justify-center overflow-hidden outline-none">
        <DialogTitle className="sr-only">{alt} 크게 보기</DialogTitle>
        <div className="relative w-auto h-auto max-w-[90vw] max-h-[90vh] aspect-video min-w-[50vw]">
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            className="object-contain rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SubmissionDetailClient({ submissionId }: { submissionId: string }) {
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

  const { data: submission, isLoading, isError, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: () => fetchSubmission(submissionId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="aspect-video w-full rounded-3xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error instanceof Error ? error.message : "제출물을 불러오지 못했습니다."}
      </div>
    );
  }

  if (!submission) return null;

  // streamUid: submission 직접 → video 관계 순서로 fallback
  const streamUid = submission.streamUid || submission.video?.streamUid;
  const statusInfo = statusMap[submission.status] || {
    label: submission.status,
    className: "bg-secondary",
    icon: null,
    glowColor: "rgba(255,255,255,0.1)"
  };
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/stars/my-videos"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            목록으로 돌아가기
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
            {submission.versionTitle || submission.assignment?.request?.title || submission.video?.title || (submission.version.startsWith("v") ? submission.version : `v${submission.version}`)}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {submission.assignment?.request?.title ?? "프로젝트 정보 없음"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all hover:scale-105 cursor-default select-none",
            statusInfo.className
          )}>
            {StatusIcon && <StatusIcon className="w-4 h-4" />}
            {statusInfo.label}
          </div>

          {/* Edit Button */}
          <Link
            href={`/stars/upload`}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 hover:scale-105 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            수정본 업로드
          </Link>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left Column: Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className="relative rounded-3xl overflow-hidden bg-black/40 ring-1 ring-white/10 transition-all duration-500 group"
            style={{
              boxShadow: `0 0 40px -10px ${statusInfo.glowColor}`
            }}
          >
            {streamUid ? (
              <div className="aspect-video w-full">
                <VideoPlayer
                  streamUid={streamUid}
                  seekTo={seekTo}
                />
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground gap-3">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">영상을 불러올 수 없습니다.</p>
              </div>
            )}
          </div>

          {/* 제작 설명 (Memo) */}
          {submission.summaryFeedback && (
            <Card className="border-0 bg-secondary/5 backdrop-blur-sm ring-1 ring-white/5 shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold">제작 설명 / 메모</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground/90">
                  {submission.summaryFeedback}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Feedback List Container */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b pb-2 border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                피드백 리스트
              </h2>
              <Badge variant="outline" className="text-xs font-mono">
                Total: {submission._count.feedbacks}
              </Badge>
            </div>
            <FeedbackList
              submissionId={submission.id}
              onTimecodeClick={(time) => setSeekTo(time)}
            />
          </div>
        </div>

        {/* Right Column: Metadata & Assets */}
        <div className="space-y-6 sticky top-6">
          {/* Thumbnail Preview Card */}
          <div className="group relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/20 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
            <DetailThumbnail
              src={submission.signedThumbnailUrl || submission.thumbnailUrl}
              alt={submission.versionTitle || "영상 썸네일"}
            />
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Duration</p>
                  <p className="text-sm font-bold">{(submission.duration || submission.video?.technicalSpec?.duration) ? formatDuration(submission.duration || submission.video?.technicalSpec?.duration || 0) : "-"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
              <CardContent className="p-4 flex flex-col gap-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Submitted
                </p>
                <p className="text-xs font-medium truncate">{formatDate(submission.createdAt)}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
              <CardContent className="p-4 flex flex-col gap-1">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Version
                </p>
                <p className="text-xs font-medium">{submission.version}</p>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
