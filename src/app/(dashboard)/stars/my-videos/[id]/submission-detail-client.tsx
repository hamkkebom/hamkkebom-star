"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video/video-player";
import { AiTodoList } from "@/components/feedback/ai-todo-list";
import { AiInsightsPanel } from "@/components/feedback/ai-insights-panel";
import { AnnotationViewer } from "@/components/star/annotation-viewer";
import { FeedbackTimeline } from "@/components/star/feedback-timeline";
import { SceneStoryboard } from "@/components/star/scene-storyboard";
import { FeedbackDetailCards } from "@/components/star/feedback-detail-card";
import { useFeedbackViewStore, type FeedbackViewFeedback } from "@/store/feedback-view-store";
import {
  type LucideIcon,
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
  Maximize2,
  LayoutGrid
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

const statusMap: Record<SubmissionStatus, { label: string; className: string; icon: LucideIcon; glowColor: string }> = {
  PENDING: {
    label: "대기중",
    className: "bg-slate-500/90 text-white border-slate-400/20 shadow-[0_0_10px_rgba(100,116,139,0.3)]",
    icon: Loader2,
    glowColor: "rgba(100,116,139,0.3)"
  },
  IN_REVIEW: {
    label: "피드백중",
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
            썸네일
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

  // Zustand 스토어
  const activeAnnotation = useFeedbackViewStore((s) => s.activeAnnotation);
  const setFeedbacks = useFeedbackViewStore((s) => s.setFeedbacks);
  const setSelectedFeedbackId = useFeedbackViewStore((s) => s.setSelectedFeedbackId);

  const { data: submission, isLoading, isError, error } = useQuery({
    queryKey: ["submission-detail", submissionId],
    queryFn: () => fetchSubmission(submissionId),
  });

  // 피드백 데이터 로드 및 스토어 동기화
  const { data: feedbackData } = useQuery({
    queryKey: ["feedbacks-scene", submissionId],
    queryFn: async () => {
      const res = await fetch(`/api/feedbacks?submissionId=${submissionId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("피드백 로드 실패");
      return res.json();
    },
    enabled: !!submissionId,
  });

  useEffect(() => {
    if (feedbackData?.data) {
      setFeedbacks(feedbackData.data as FeedbackViewFeedback[]);
    }
  }, [feedbackData, setFeedbacks]);

  // 피드백 상세 페이지 진입 시 미확인 피드백 읽음 처리
  const queryClient = useQueryClient();
  const markedRef = useRef(false);
  useEffect(() => {
    if (!submissionId || markedRef.current) return;
    markedRef.current = true;
    fetch("/api/stars/feedbacks/mark-seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    })
      .then((res) => {
        if (res.ok) {
          // 네비게이션 벗지 카운트 갱신
          queryClient.invalidateQueries({ queryKey: ["star-unread-feedbacks"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-badge"] });
          queryClient.invalidateQueries({ queryKey: ["submissions-my"] });
        }
      })
      .catch(() => { });
  }, [submissionId, queryClient]);

  if (!isLoading && isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error instanceof Error ? error.message : "제출물을 불러오지 못했습니다."}
      </div>
    );
  }

  // streamUid: submission 직접 → video 관계 순서로 fallback
  const streamUid = submission?.streamUid || submission?.video?.streamUid;
  const statusInfo = submission ? (statusMap[submission.status] || {
    label: submission.status,
    className: "bg-secondary",
    icon: null,
    glowColor: "rgba(255,255,255,0.1)"
  }) : null;
  const StatusIcon = statusInfo?.icon;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Navigation — 항상 즉시 표시 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/stars/feedback"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            피드백 목록으로
          </Link>
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-40" />
            </>
          ) : submission ? (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                {submission.versionTitle || submission.assignment?.request?.title || submission.video?.title || (submission.version.startsWith("v") ? submission.version : `v${submission.version}`)}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                {submission.assignment?.request?.title ?? "프로젝트 정보 없음"}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {statusInfo && (
            <div className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all hover:scale-105 cursor-default select-none",
              statusInfo.className
            )}>
              {StatusIcon && <StatusIcon className="w-4 h-4" />}
              {statusInfo.label}
            </div>
          )}

          {/* Go to Manager Button */}
          {submission && (
            <Link
              href={`/stars/my-videos/${submission.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-secondary/80 border border-secondary px-4 py-1.5 text-xs font-bold hover:bg-secondary hover:scale-105 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              영상 관리
            </Link>
          )}

          {/* Edit/Upload Button */}
          <Link
            href={`/stars/upload`}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 hover:scale-105 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            수정본 업로드
          </Link>
        </div>
      </div>


      {/* Main Grid Layout - Cinema Focus View */}
      {/* ═══ Scene-First Feedback Layout ═══ */}
      <div className="space-y-6">

        {/* ── 영상 + 어노테이션 + 타임라인 ── */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

          <div className="relative rounded-[1.8rem] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
            {isLoading ? (
              <Skeleton className="aspect-video w-full" />
            ) : streamUid ? (
              <div className="aspect-video w-full relative">
                <VideoPlayer streamUid={streamUid} seekTo={seekTo} />
                <AnnotationViewer annotation={activeAnnotation as Parameters<typeof AnnotationViewer>[0]["annotation"]} isActive={!!activeAnnotation} />
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 gap-3">
                <AlertCircle className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">영상을 불러올 수 없습니다.</p>
              </div>
            )}

            {/* 타임라인 마커 바 */}
            {!isLoading && (
              <div className="px-4 pb-3 bg-gradient-to-t from-black/60 to-transparent">
                <FeedbackTimeline onSeek={(t) => setSeekTo(t)} />
              </div>
            )}
          </div>
        </div>

        {/* ── 장면별 스토리보드 갤러리 ── */}
        {!isLoading && (
          <SceneStoryboard onSceneClick={(t) => setSeekTo(t)} />
        )}

        {/* ── 메인 그리드: 피드백 상세 + 사이드바 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left: 피드백 상세 카드 */}
          <div className="lg:col-span-8 space-y-6">
            {isLoading ? (
              <>
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </>
            ) : submission ? (
              <>
                {/* 제작 설명 (Memo) */}
                {submission.summaryFeedback && (
                  <Card className="border-0 bg-secondary/30 backdrop-blur-sm ring-1 ring-border/50 shadow-sm">
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

                {/* Scene-First 피드백 상세 카드 리스트 */}
                <FeedbackDetailCards
                  onTimecodeClick={(t) => setSeekTo(t)}
                />
              </>
            ) : null}
          </div>

          {/* Right: AI 보조 + 메타데이터 */}
          <div className="lg:col-span-4 space-y-6 sticky top-6">
            {isLoading ? (
              <>
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="aspect-video w-full rounded-2xl" />
              </>
            ) : submission ? (
              <>
                {/* AI Insights (접은 상태로 보조) */}
                <div className="space-y-3">
                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-400 hover:text-slate-200 transition-colors">
                      <span className="text-lg">🤖</span>
                      AI가 발견한 개선점
                      <span className="text-[10px] bg-violet-500/10 text-violet-300 px-2 py-0.5 rounded-full group-open:hidden">펼치기</span>
                    </summary>
                    <div className="mt-3 space-y-4">
                      <AiInsightsPanel submissionId={submission.id} />
                      <AiTodoList submissionId={submission.id} />
                    </div>
                  </details>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="col-span-2 bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">재생 시간</p>
                        <p className="text-sm font-bold">{(submission.duration || submission.video?.technicalSpec?.duration) ? formatDuration(submission.duration || submission.video?.technicalSpec?.duration || 0) : "-"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        제출일
                      </p>
                      <p className="text-xs font-medium truncate">{formatDate(submission.createdAt)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card/50 backdrop-blur-sm border-white/5 shadow-sm hover:bg-card/80 transition-colors">
                    <CardContent className="p-4 flex flex-col gap-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        버전
                      </p>
                      <p className="text-xs font-medium">{submission.version}</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
