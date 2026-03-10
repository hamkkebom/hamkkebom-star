"use client";

import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale/ko";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadThumbnail } from "@/lib/download-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { ThumbnailPreview } from "@/components/admin/feedback-dashboard";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Download,
  Loader2,
  Search,
  Clock,
  ImageIcon,
  Play,
  ExternalLink,
  ZoomIn,
  FileText,
  Columns2,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";

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
  signedThumbnailUrl?: string | null;
  assignmentId: string | null;
  star: { id: string; name: string; email: string; avatarUrl: string | null };
  assignment: {
    request: { id: string; title: string; deadline: string };
  } | null;
  video: { id: string; title: string; streamUid: string | null; thumbnailUrl?: string | null } | null;
  feedbacks: Feedback[];
  _count: { feedbacks: number };
};

type VersionSibling = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string | null;
  status: string;
  createdAt: string;
  _count: { feedbacks: number };
};

type StarItem = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  avatarUrl: string | null;
  grade: { id: string; name: string; color: string | null } | null;
};

type VideoEventLogEntry = {
  id: string;
  videoId: string;
  event: string;
  fromState: string | null;
  toState: string | null;
  metadata: unknown;
  createdAt: string;
};

const eventNameMap: Record<string, string> = {
  SUBMISSION_APPROVED: "제출물 승인",
  SUBMISSION_REJECTED: "제출물 반려",
  METADATA_UPDATED: "메타데이터 수정",
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
  IN_REVIEW: "피드백중",
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
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState("");
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [starSearch, setStarSearch] = useState("");
  const [compareMode, setCompareMode] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // 서버사이드 프록시 — API가 직접 mp4 파일을 반환합니다
      const a = document.createElement("a");
      a.href = `/api/submissions/${id}/download`;
      a.download = "";
      a.click();
      toast.success("다운로드가 시작되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const { data, isLoading, error } = useQuery<{ data: SubmissionDetail }>({
    queryKey: ["submission-detail", id],
    queryFn: () => fetch(`/api/submissions/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const assignmentId = data?.data?.assignmentId;
  const { data: versionData } = useQuery<{
    data: VersionSibling[];
    total: number;
  }>({
    queryKey: ["submission-versions", assignmentId],
    queryFn: () =>
      fetch(`/api/submissions?assignmentId=${assignmentId}&pageSize=50`).then((r) =>
        r.json()
      ),
    enabled: !!assignmentId,
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

  const starsQuery = useQuery<{ data: StarItem[] }>({
    queryKey: ["admin-stars", "reassign"],
    queryFn: () =>
      fetch("/api/admin/stars?pageSize=50").then(async (r) => {
        if (!r.ok) throw new Error("STAR 목록을 불러올 수 없습니다.");
        return r.json();
      }),
    enabled: reassignDialogOpen,
  });

  const filteredStars = useMemo(() => {
    const stars = starsQuery.data?.data ?? [];
    const currentStarId = data?.data?.star.id;
    const filtered = stars.filter((s) => s.id !== currentStarId);
    if (!starSearch.trim()) return filtered;
    const q = starSearch.trim().toLowerCase();
    return filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.chineseName?.toLowerCase().includes(q) ?? false) ||
        s.email.toLowerCase().includes(q)
    );
  }, [starsQuery.data?.data, data?.data?.star.id, starSearch]);

  const reassignMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reassignReason || "재배정을 위한 반려" }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error?.message || "반려 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("제출물이 반려되었습니다. 새로운 STAR가 프로젝트 게시판에서 수락할 수 있습니다.");
      toast.info("선택한 STAR에게 직접 연락하여 프로젝트 수락을 안내해주세요.", {
        duration: 6000,
      });
      setReassignDialogOpen(false);
      setReassignReason("");
      setSelectedStarId(null);
      setStarSearch("");
      queryClient.invalidateQueries({ queryKey: ["submission-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      router.push("/admin/reviews");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const videoId = data?.data?.video?.id;
  const eventsQuery = useQuery<{ data: VideoEventLogEntry[] }>({
    queryKey: ["video-events", videoId],
    queryFn: () =>
      fetch(`/api/videos/${videoId}/events`).then((r) => r.json()),
    enabled: !!videoId,
  });

  const versionSiblings = useMemo(() => {
    const siblings = versionData?.data ?? [];
    if (siblings.length === 0) return [];
    return [...siblings].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [versionData?.data]);

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Thumbnail Preview 추가 */}
        <div className="relative w-24 aspect-video shrink-0 rounded-md overflow-hidden bg-black/5 ring-1 ring-slate-200 dark:ring-white/[0.08]">
          <ThumbnailPreview
            thumbnailUrl={sub.signedThumbnailUrl || sub.video?.thumbnailUrl || null}
            videoTitle={sub.video?.title || sub.assignment?.request.title || sub.versionTitle || "제목 없음"}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {sub.video?.title || sub.assignment?.request.title || sub.versionTitle || `v${sub.version.replace(/^v/i, "")}`}
          </h1>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-2">
            <span>{sub.star.name}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span>{sub.versionTitle || `v${sub.version.replace(/^v/i, "")}`}</span>
          </p>
        </div>
        <Badge className={cn("shrink-0", statusColors[sub.status] || "")}>
          {statusLabels[sub.status] || sub.status}
        </Badge>
      </div>

      {/* Video Player */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-lg">
          {(sub.streamUid || sub.video?.streamUid) ? (
            <VideoPlayer
              streamUid={(sub.streamUid || sub.video?.streamUid)!}
              onTimeUpdate={handleTimeUpdate}
              seekTo={seekTo}
            />
          ) : (
            <div className="flex items-center justify-center h-64 bg-muted">
              <p className="text-muted-foreground">영상이 등록되지 않았습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>


      {(sub.streamUid || sub.video?.streamUid) && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />다운로드 중...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />영상 다운로드</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.open(`/api/feedbacks/export?submissionId=${sub.id}`, "_blank");
              toast.success("피드백 리포트 다운로드가 시작되었습니다.");
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            피드백 내보내기
          </Button>
          {versionSiblings.length > 1 && (
            <Button
              variant={compareMode ? "default" : "outline"}
              onClick={() => setCompareMode(!compareMode)}
            >
              <Columns2 className="mr-2 h-4 w-4" />
              {compareMode ? "비교 닫기" : "버전 비교"}
            </Button>
          )}
        </div>
      )}

      {/* 버전 비교 뷰 */}
      {compareMode && versionSiblings.length > 1 && (() => {
        const currentIdx = versionSiblings.findIndex(v => v.id === sub.id);
        const prevVersion = currentIdx > 0 ? versionSiblings[currentIdx - 1] : null;
        if (!prevVersion) return (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              비교할 이전 버전이 없습니다.
            </CardContent>
          </Card>
        );
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Columns2 className="h-4 w-4 text-violet-500" />
                버전 비교
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">이전</Badge>
                    <span className="text-sm font-medium">{prevVersion.versionTitle || `v${prevVersion.version.replace(/^v/i, "")}`}</span>
                    <Badge className={cn("text-xs", statusColors[prevVersion.status])}>{statusLabels[prevVersion.status]}</Badge>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <VideoPlayer streamUid={(prevVersion as any).streamUid || ""} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="text-xs bg-violet-500">현재</Badge>
                    <span className="text-sm font-medium">{sub.versionTitle || `v${sub.version.replace(/^v/i, "")}`}</span>
                    <Badge className={cn("text-xs", statusColors[sub.status])}>{statusLabels[sub.status]}</Badge>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <VideoPlayer streamUid={(sub.streamUid || sub.video?.streamUid)!} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ========== 스타 등록 썸네일 관리 ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-indigo-500" />
            스타 등록 썸네일
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(sub.signedThumbnailUrl || sub.video?.thumbnailUrl) ? (
            <div className="space-y-3">
              {/* 썸네일 메인 프리뷰 */}
              <div className="relative group aspect-video w-full max-w-lg rounded-xl overflow-hidden bg-black ring-1 ring-slate-200 dark:ring-white/[0.08] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sub.signedThumbnailUrl || sub.video?.thumbnailUrl || ""}
                  alt={sub.video?.title || "등록 썸네일"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* 호버 시 확대 아이콘 */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={sub.signedThumbnailUrl || sub.video?.thumbnailUrl || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ZoomIn className="w-4 h-4" />
                    새창
                  </a>
                  <button
                    className="flex items-center gap-2 bg-indigo-500/80 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full hover:bg-indigo-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadThumbnail(sub.signedThumbnailUrl || sub.video?.thumbnailUrl, sub.video?.title || "썸네일");
                    }}
                  >
                    <Download className="w-4 h-4" />
                    다운로드
                  </button>
                </div>
              </div>
              {/* 썸네일 정보 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>스타가 등록한 썸네일이 확인되었습니다.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">등록된 썸네일이 없습니다</p>
              <p className="text-xs text-muted-foreground/60">스타가 영상 제출 시 썸네일을 등록하지 않았습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 버전 이력 */}
      {versionSiblings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              버전 이력 ({versionSiblings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {versionSiblings.map((sibling, index) => {
                const isCurrent = sibling.id === sub.id;
                const isLast = index === versionSiblings.length - 1;
                const isOnly = versionSiblings.length === 1;
                return (
                  <div key={sibling.id} className="relative flex gap-3">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${isCurrent
                          ? "bg-primary ring-2 ring-primary/30"
                          : "bg-muted border-2 border-muted-foreground/30"
                          }`}
                      />
                      {!isLast && !isOnly && (
                        <div className="w-px flex-1 bg-border min-h-4" />
                      )}
                    </div>
                    {/* Content */}
                    <div
                      className={`flex-1 pb-4 ${isCurrent
                        ? ""
                        : "cursor-pointer hover:bg-accent/50 rounded-lg"
                        } p-3 -mt-1`}
                      onClick={
                        isCurrent
                          ? undefined
                          : () => router.push(`/admin/reviews/${sibling.id}`)
                      }
                      role={isCurrent ? undefined : "button"}
                      tabIndex={isCurrent ? undefined : 0}
                      onKeyDown={
                        isCurrent
                          ? undefined
                          : (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              router.push(`/admin/reviews/${sibling.id}`);
                            }
                          }
                      }
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {sibling.versionTitle ||
                            `v${sibling.version.replace(/^v/i, "")}`}
                        </span>
                        <Badge
                          className={`text-xs ${statusColors[sibling.status] || ""}`}
                        >
                          {statusLabels[sibling.status] || sibling.status}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            현재 버전
                          </Badge>
                        )}
                        {isOnly && (
                          <Badge variant="secondary" className="text-xs">
                            첫 번째 제출
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(sibling.createdAt), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                        <span>피드백 {sibling._count.feedbacks}건</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve / Reject / Reassign Controls */}
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
          <Button
            onClick={() => setReassignDialogOpen(true)}
            variant="outline"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            재배정
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
          <FeedbackForm
            submissionId={sub.id}
            currentTime={currentTime}
            onSubmitted={() => {
              queryClient.invalidateQueries({ queryKey: ["feedbacks", sub.id] });
              queryClient.invalidateQueries({ queryKey: ["submission-detail", id] });
            }}
          />
          <FeedbackList
            submissionId={sub.id}
            onTimecodeClick={setSeekTo}
            onFeedbacksChanged={() => {
              queryClient.invalidateQueries({ queryKey: ["submission-detail", id] });
            }}
          />
        </CardContent>
      </Card>

      {/* 활동 이력 Section */}
      {sub.video?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              활동 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : !eventsQuery.data?.data?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2" />
                <p className="text-sm">이 영상에 대한 활동 이력이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventsQuery.data.data.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {eventNameMap[evt.event] ?? evt.event}
                        </span>
                        {(evt.fromState || evt.toState) && (
                          <span className="flex items-center gap-1">
                            {evt.fromState && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {evt.fromState}
                              </Badge>
                            )}
                            {evt.fromState && evt.toState && (
                              <span className="text-muted-foreground">→</span>
                            )}
                            {evt.toState && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {evt.toState}
                              </Badge>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(evt.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reassign Dialog */}
      <Dialog
        open={reassignDialogOpen}
        onOpenChange={(open) => {
          setReassignDialogOpen(open);
          if (!open) {
            setSelectedStarId(null);
            setStarSearch("");
            setReassignReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>다른 STAR에게 재배정</DialogTitle>
            <DialogDescription>
              현재 제출물을 반려하고 다른 STAR에게 재배정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* STAR Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="STAR 이름 또는 이메일로 검색..."
                value={starSearch}
                onChange={(e) => setStarSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* STAR List */}
            <ScrollArea className="h-60 rounded-md border">
              {starsQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredStars.length === 0 ? (
                <div className="flex h-full items-center justify-center p-6">
                  <p className="text-sm text-muted-foreground">
                    {starSearch ? "검색 결과가 없습니다." : "배정 가능한 STAR가 없습니다."}
                  </p>
                </div>
              ) : (
                <div className="p-1">
                  {filteredStars.map((star) => (
                    <button
                      key={star.id}
                      type="button"
                      onClick={() => setSelectedStarId(star.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${selectedStarId === star.id
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-muted"
                        }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${selectedStarId === star.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {star.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {star.name}
                          </span>
                          {star.chineseName && (
                            <span className="text-xs text-muted-foreground">
                              {star.chineseName}
                            </span>
                          )}
                          {star.grade && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {star.grade.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {star.email}
                        </p>
                      </div>
                      <div
                        className={`h-4 w-4 shrink-0 rounded-full border-2 ${selectedStarId === star.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                          }`}
                      >
                        {selectedStarId === star.id && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reassign-reason">반려 사유 (선택)</Label>
              <Textarea
                id="reassign-reason"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="반려 사유를 입력하세요..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setReassignDialogOpen(false)}
              disabled={reassignMutation.isPending}
            >
              취소
            </Button>
            <Button
              onClick={() => reassignMutation.mutate()}
              disabled={!selectedStarId || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "재배정 확인"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
