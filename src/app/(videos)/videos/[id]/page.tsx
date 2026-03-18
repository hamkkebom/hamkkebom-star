"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VideoPlayer } from "@/components/video/video-player";
import { LikeButton } from "@/components/video/like-button";
import { BookmarkButton } from "@/components/video/bookmark-button";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const VideoComments = dynamic(
  () => import("@/components/video/video-comments").then((m) => ({ default: m.VideoComments })),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    ),
  }
);

const ReportDialog = dynamic(
  () => import("@/components/community/report-dialog").then((m) => ({ default: m.ReportDialog })),
  { ssr: false }
);
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Film,
  HardDrive,
  Monitor,
  Music,
  Play,
  Share2,
  Tag,
  Tv,
  Video,
  MessageSquare,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Youtube,
  Instagram,
  Globe,
  ExternalLink,
  MoreVertical,
  Flag,
  Star,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

/* ─── Types ─── */
type TechnicalSpec = {
  filename: string | null;
  format: string | null;
  fileSize: number | null;
  videoCodec: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  duration: number | null;
  audioCodec: string | null;
};

type MediaPlacement = {
  id: string;
  medium: string;
  channel: string | null;
  url: string | null;
  startDate: string | null;
  campaignName: string | null;
};

type VideoDetail = {
  id: string;
  title: string;
  description: string | null;
  lyrics: string | null;
  videoSubject: string | null;
  status: string;
  streamUid: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  owner: { id: string; name: string; chineseName: string | null; email: string; avatarUrl: string | null };
  category: { id: string; name: string; slug: string } | null;
  counselor: { id: string; displayName: string } | null;
  technicalSpec: TechnicalSpec | null;
  hasLiked?: boolean;
  likeCount?: number;
  hasBookmarked?: boolean;
  commentCount?: number;
  mediaPlacements?: MediaPlacement[];
  averageRating?: number;
  ratingCount?: number;
  userRating?: number;
};

/* ─── Config ─── */
const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "임시저장", className: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  PENDING: { label: "검토 중", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  APPROVED: { label: "승인됨", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  FINAL: { label: "최종본", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
};

/* ─── Utilities ─── */
function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}분 ${s.toString().padStart(2, "0")}초`;
}

function formatDurationShort(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function handleShare(title: string) {
  if (navigator.share) {
    navigator.share({ title, url: window.location.href }).catch(() => { });
  } else {
    navigator.clipboard.writeText(window.location.href);
    toast.success("링크가 복사되었습니다.");
  }
}

/* ─── Star Rating Component ─── */
function StarRating({ 
  average = 0, 
  count = 0, 
  userRating = 0, 
  onRate, 
  readonly = false 
}: { 
  average?: number; 
  count?: number; 
  userRating?: number; 
  onRate?: (rating: number) => void;
  readonly?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isRatingMode, setIsRatingMode] = useState(false);
  
  const displayRating = isRatingMode ? (hoverRating || userRating || 0) : average;
  
  const handleStarClick = (rating: number) => {
    if (readonly) return;
    if (onRate) onRate(rating);
    setIsRatingMode(false);
  };

  return (
    <div className="flex flex-col items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
      <div 
        className="flex items-center gap-1 cursor-pointer" 
        onClick={() => !readonly && setIsRatingMode(true)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = displayRating >= star;
          const isHalf = !isFilled && displayRating >= star - 0.5;
          
          return (
            <div 
              key={star}
              className="relative p-1 touch-manipulation"
              onMouseEnter={() => !readonly && isRatingMode && setHoverRating(star)}
              onClick={(e) => {
                if (isRatingMode) {
                  e.stopPropagation();
                  handleStarClick(star);
                }
              }}
            >
              {isFilled ? (
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ) : isHalf ? (
                <div className="relative w-6 h-6">
                  <Star className="absolute inset-0 w-6 h-6 text-yellow-400/30" />
                  <div className="absolute inset-0 overflow-hidden w-[50%]">
                    <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
              ) : (
                <Star className="w-6 h-6 text-yellow-400/30" />
              )}
            </div>
          );
        })}
      </div>
      {!isRatingMode && (
        <div className="text-xs text-white/60 font-medium">
          {average.toFixed(1)} / 5.0 <span className="text-white/40">({count}명 평가)</span>
        </div>
      )}
      {isRatingMode && (
        <div className="text-xs text-yellow-400 font-medium animate-pulse">
          별점을 선택해주세요
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════════════════ */
export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isTechSpecsExpanded, setIsTechSpecsExpanded] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);

  const { data, isLoading, error } = useQuery<{ data: VideoDetail }>({
    queryKey: ["video-detail", id],
    queryFn: () => fetch(`/api/videos/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const video = data?.data ?? null;

  const { data: relatedData } = useQuery<{ data: VideoDetail[] }>({
    queryKey: ["related-videos", video?.category?.id],
    queryFn: () => fetch(`/api/videos?categoryId=${video?.category?.id}&pageSize=7`).then((r) => r.json()),
    enabled: !!video?.category?.id,
  });

  const relatedVideos = relatedData?.data?.filter(v => v.id !== id).slice(0, 6) || [];

  // ─── 조회수 증가 트리거 (StrictMode 중복 방지) ───
  const viewTracked = useRef(false);
  useEffect(() => {
    if (id && !viewTracked.current) {
      viewTracked.current = true;
      fetch(`/api/videos/${id}/view`, { method: "POST" }).catch(() => { });
    }
  }, [id]);

  /* ─── Error / Not found ─── */
  if (!isLoading && (error || !data?.data)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-violet-100 p-6 dark:bg-violet-900/20">
          <Video className="h-10 w-10 text-violet-500" />
        </div>
        <h2 className="text-xl font-semibold">영상을 찾을 수 없습니다</h2>
        <p className="text-sm text-muted-foreground">삭제되었거나 접근 권한이 없는 영상입니다.</p>
        <Button variant="outline" onClick={() => router.push("/")} className="mt-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> 영상 목록으로
        </Button>
      </div>
    );
  }

  const spec = video?.technicalSpec ?? null;
  const status = video ? (statusConfig[video.status] || { label: video.status, className: "" }) : null;

  return (
    <div className="relative min-h-screen bg-[#06060e] text-white pb-28 md:pb-0">
      {/* ─── Ambient Background ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-[20%] top-[5%] h-[600px] w-[600px] animate-[float_8s_ease-in-out_infinite] rounded-full bg-violet-600/8 blur-[150px]" />
        <div className="absolute -right-[15%] top-[40%] h-[500px] w-[500px] animate-[float_12s_ease-in-out_infinite_reverse] rounded-full bg-blue-500/6 blur-[130px]" />
        <div className="absolute bottom-[10%] left-[40%] h-[400px] w-[400px] animate-[float_10s_ease-in-out_infinite_2s] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      {/* ═══════════════ Cinema Player Section ═══════════════ */}
      <section className="relative bg-black">
        <div className="mx-auto max-w-7xl">
          {/* Floating back button — 항상 즉시 표시 */}
          <div className="absolute left-4 top-4 z-20 md:left-8 md:top-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md hover:border-white/20 hover:bg-black/70 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Video Player — z-10으로 올려 iframe 컨트롤이 오버레이 위에 오도록 */}
          <div className="relative z-10 w-full max-h-[80vh] overflow-hidden flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="aspect-video w-full bg-white/5" />
            ) : video?.streamUid ? (
              <VideoPlayer streamUid={video.streamUid} />
            ) : video?.thumbnailUrl || video?.streamUid ? (
              <div className="relative h-full w-full">
                <Image
                  src={
                    video.streamUid
                      ? `https://videodelivery.net/${video.streamUid}/thumbnails/thumbnail.jpg?width=1280&height=720&fit=crop`
                      : video.thumbnailUrl!
                  }
                  alt={video.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                    <Play className="ml-1 h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                <Tv className="h-20 w-20 text-slate-700" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom gradient — z-0으로 플레이어 뒤에 배치하여 컨트롤 호버 방해 방지 */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-32 bg-gradient-to-t from-[#06060e] to-transparent" />
      </section>

      {/* ═══════════════ Content ═══════════════ */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Title Row ── */}
        <div className="-mt-12 relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pointer-events-none">
          <div className="min-w-0 flex-1 space-y-4 pointer-events-auto">
            {isLoading ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-white/5" />
                </div>
                <Skeleton className="h-12 w-2/3 bg-white/5" />
                <Skeleton className="h-4 w-1/3 bg-white/5" />
              </>
            ) : video && status ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`border ${status.className}`}>
                    {status.label}
                  </Badge>
                  {video.category && (
                    <Link
                      href={`/videos?category=${video.category.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                    >
                      <Tag className="h-3 w-3" />
                      {video.category.name}
                    </Link>
                  )}
                  {video.videoSubject && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                      <Film className="h-3 w-3" />
                      {video.videoSubject}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {video.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
                  <div className="flex items-center gap-1.5">
                     <Calendar className="h-3.5 w-3.5" />
                    {new Date(video.createdAt).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  {spec?.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDurationShort(spec.duration)}
                    </div>
                  )}
                  {spec?.width && spec?.height && (
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3.5 w-3.5" />
                      {spec.width}×{spec.height}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Action buttons — Desktop Inline view */}
          <div className="hidden shrink-0 items-center gap-2 pointer-events-auto md:flex">
            {isAdmin && video?.streamUid && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 text-violet-300 border-violet-500/30 hover:bg-violet-500/20"
                title="다운로드"
                asChild
              >
                <a href={`/api/videos/${video.id}/download`} download>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">영상 다운로드</span>
                </a>
              </Button>
            )}
            {video && (
              <>
                <LikeButton
                  videoId={video.id}
                  initialLiked={video.hasLiked ?? false}
                  initialCount={video.likeCount ?? 0}
                />
                <BookmarkButton
                  videoId={video.id}
                  initialBookmarked={video.hasBookmarked ?? false}
                />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white"
              onClick={() => video && handleShare(video.title)}
              title="공유"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {video && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <ReportDialog targetType="VIDEO" targetId={video.id}>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-500 cursor-pointer">
                      <Flag className="mr-2 h-4 w-4" />
                      신고하기
                    </DropdownMenuItem>
                  </ReportDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ── Two-Column Layout ── */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column — Main content */}
          <div className="space-y-10">
            {isLoading ? (
              <>
                <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
                <Skeleton className="h-60 w-full rounded-2xl bg-white/5" />
              </>
            ) : video ? (
              <>
                {/* Description */}
                {video.description && (
                  <section>
                    <SectionHeader icon={<Film className="h-4 w-4" />} title="제작의도 / 설명" />
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                      <div className={`relative ${!isDescExpanded ? 'max-h-24 overflow-hidden' : ''}`}>
                        <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-white/70">
                          {video.description}
                        </p>
                        {!isDescExpanded && (
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#06060e] to-transparent" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full text-white/50 hover:text-white"
                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                      >
                        {isDescExpanded ? (
                          <>접기 <ChevronUp className="ml-1 h-4 w-4" /></>
                        ) : (
                          <>더보기 <ChevronDown className="ml-1 h-4 w-4" /></>
                        )}
                      </Button>
                    </div>
                  </section>
                )}

                {/* Lyrics */}
                {video.lyrics && (
                  <section>
                    <SectionHeader icon={<Music className="h-4 w-4" />} title="가사" />
                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                      {/* Decorative music note */}
                      <div className="pointer-events-none absolute -right-4 -top-4 text-8xl text-white/[0.02]">
                        ♪
                      </div>
                      <p className="whitespace-pre-wrap font-mono text-sm leading-[2] text-white/60">
                        {video.lyrics}
                      </p>
                    </div>
                  </section>
                )}

                {/* Technical Specs */}
                {spec && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <SectionHeader icon={<Monitor className="h-4 w-4" />} title="기술 스펙" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="md:hidden text-white/50"
                        onClick={() => setIsTechSpecsExpanded(!isTechSpecsExpanded)}
                      >
                        {isTechSpecsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition-all ${!isTechSpecsExpanded ? 'hidden md:block' : 'block'}`}>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                        {spec.duration != null && (
                          <SpecItem label="길이" value={formatDuration(spec.duration)} />
                        )}
                        {spec.fileSize != null && (
                          <SpecItem label="파일 크기" value={formatFileSize(spec.fileSize)} />
                        )}
                        {spec.width != null && spec.height != null && (
                          <SpecItem label="해상도" value={`${spec.width}×${spec.height}`} />
                        )}
                        {spec.format && <SpecItem label="포맷" value={spec.format} />}
                        {spec.videoCodec && <SpecItem label="비디오 코덱" value={spec.videoCodec} />}
                        {spec.audioCodec && <SpecItem label="오디오 코덱" value={spec.audioCodec} />}
                        {spec.fps != null && <SpecItem label="FPS" value={String(spec.fps)} />}
                        {spec.filename && <SpecItem label="파일명" value={spec.filename} />}
                      </div>
                    </div>
                  </section>
                )}

                {/* Comments Section (Desktop only) */}
                <section id="comments-section" className="hidden md:block scroll-mt-24">
                  <SectionHeader icon={<MessageSquare className="h-4 w-4" />} title="댓글" />
                  <div className="rounded-2xl border border-white/[0.06] bg-[#06060e] p-4 sm:p-6 backdrop-blur-sm shadow-xl">
                    <VideoComments videoId={video.id} />
                  </div>
                </section>

                {/* Media Placements Section */}
                {video.mediaPlacements && video.mediaPlacements.length > 0 && (
                  <section>
                    <SectionHeader icon={<Globe className="h-4 w-4" />} title="이 영상이 활약하는 곳" />
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                      {video.mediaPlacements.map((placement) => {
                        const isYoutube = placement.medium.toLowerCase().includes("youtube") || placement.medium.toLowerCase().includes("유튜브");
                        const isInstagram = placement.medium.toLowerCase().includes("instagram") || placement.medium.toLowerCase().includes("인스타그램");
                        const isTiktok = placement.medium.toLowerCase().includes("tiktok") || placement.medium.toLowerCase().includes("틱톡");
                        
                        let icon = <Globe className="h-5 w-5" />;
                        let colorClass = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                        
                        if (isYoutube) {
                          icon = <Youtube className="h-5 w-5" />;
                          colorClass = "text-red-400 bg-red-500/10 border-red-500/20";
                        } else if (isInstagram) {
                          icon = <Instagram className="h-5 w-5" />;
                          colorClass = "text-pink-400 bg-pink-500/10 border-pink-500/20";
                        } else if (isTiktok) {
                          icon = <Film className="h-5 w-5" />;
                          colorClass = "text-slate-300 bg-slate-500/10 border-slate-500/20";
                        }

                        return (
                          <div key={placement.id} className="min-w-[240px] snap-start rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${colorClass}`}>
                                {icon}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white/90">{placement.medium}</p>
                                {placement.channel && <p className="text-xs text-white/50">{placement.channel}</p>}
                              </div>
                            </div>
                            {placement.campaignName && (
                              <p className="text-sm text-white/70 line-clamp-2">{placement.campaignName}</p>
                            )}
                            <div className="mt-auto pt-2 flex items-center justify-between">
                              <span className="text-xs text-white/40">
                                {placement.startDate ? new Date(placement.startDate).toLocaleDateString("ko-KR") : "진행 중"}
                              </span>
                              {placement.url && (
                                <a
                                  href={placement.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                                >
                                  매체에서 보기 <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Related Videos (Mobile only) */}
                {relatedVideos.length > 0 && (
                  <section className="md:hidden">
                    <SectionHeader icon={<Film className="h-4 w-4" />} title="관련 영상" />
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                      {relatedVideos.map((rv) => (
                        <Link key={rv.id} href={`/videos/${rv.id}`} className="min-w-[200px] snap-start group">
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 mb-2">
                            {rv.thumbnailUrl ? (
                              <Image src={rv.thumbnailUrl} alt={rv.title} fill className="object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-8 w-8 text-white/20" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-sm font-medium line-clamp-2 text-white/90 group-hover:text-violet-300 transition-colors">{rv.title}</h4>
                          <p className="text-xs text-white/50 mt-1">{rv.owner.chineseName || rv.owner.name}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : null}
          </div>

          {/* Right Column — Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
              </>
            ) : video ? (
              <div className="space-y-6">
                {/* Creator Card */}
                <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-6 backdrop-blur-sm flex flex-col items-center text-center">
                  <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 bg-slate-800">
                    {video.owner.avatarUrl ? (
                      <Image src={video.owner.avatarUrl} alt={video.owner.name} fill className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xl font-bold text-white/50">
                        {video.owner.chineseName && video.owner.chineseName.length > 0
                          ? video.owner.chineseName.charAt(0)
                          : video.owner.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {video.owner.chineseName || video.owner.name}
                  </h3>
                  <p className="text-sm text-white/50 mb-4">크리에이터</p>
                  <Button className="w-full gap-2 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                    <UserPlus className="h-4 w-4" />
                    팔로우
                  </Button>
                </div>

                {/* Video Info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30">
                    영상 정보
                  </p>
                  <div className="space-y-3">
                    <QuickInfoRow
                      icon={<Calendar className="h-3.5 w-3.5" />}
                      label="업로드 날짜"
                      value={new Date(video.createdAt).toLocaleDateString("ko-KR")}
                    />
                    {spec?.duration && (
                      <QuickInfoRow
                        icon={<Clock className="h-3.5 w-3.5" />}
                        label="영상 길이"
                        value={formatDuration(spec.duration)}
                      />
                    )}
                    {spec?.fileSize && (
                      <QuickInfoRow
                        icon={<HardDrive className="h-3.5 w-3.5" />}
                        label="파일 크기"
                        value={formatFileSize(spec.fileSize)}
                      />
                    )}
                    {video.category && (
                      <QuickInfoRow
                        icon={<Tag className="h-3.5 w-3.5" />}
                        label="카테고리"
                        value={video.category.name}
                      />
                    )}
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/[0.06]">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/30 text-center">
                      영상 평가
                    </p>
                    <StarRating 
                      average={video.averageRating ?? 4.5} 
                      count={video.ratingCount ?? 12} 
                      userRating={video.userRating}
                      readonly={!user}
                      onRate={(rating) => {
                        if (!user) {
                          toast.error("로그인이 필요합니다.");
                          return;
                        }
                        toast.success(`별점 ${rating}점을 주셨습니다.`);
                        // Optimistic update logic would go here
                      }}
                    />
                  </div>
                </div>

                {/* Related Videos (Desktop only) */}
                {relatedVideos.length > 0 && (
                  <div className="hidden md:block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wider text-white/30">
                      관련 영상
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {relatedVideos.map((rv) => (
                        <Link key={rv.id} href={`/videos/${rv.id}`} className="group">
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-white/5 mb-2">
                            {rv.thumbnailUrl ? (
                              <Image src={rv.thumbnailUrl} alt={rv.title} fill className="object-cover transition-transform group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-6 w-6 text-white/20" />
                              </div>
                            )}
                          </div>
                          <h4 className="text-xs font-medium line-clamp-2 text-white/80 group-hover:text-violet-300 transition-colors">{rv.title}</h4>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </aside>
        </div>

        {/* ── Bottom Nav — 항상 즉시 표시 ── */}
        <div className="mt-16 border-t border-white/[0.06] pb-16 pt-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition-all hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-300"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>

      {/* ── Fixed Bottom Action Bar (Mobile only) ── */}
      {video && (
        <div className="fixed bottom-14 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/90 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <LikeButton
                videoId={video.id}
                initialLiked={video.hasLiked ?? false}
                initialCount={video.likeCount ?? 0}
              />
              <span className="text-[10px] text-white/50">좋아요</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <BookmarkButton
                videoId={video.id}
                initialBookmarked={video.hasBookmarked ?? false}
              />
              <span className="text-[10px] text-white/50">북마크</span>
            </div>
            
            <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
              <SheetTrigger asChild>
                <div className="flex flex-col items-center gap-1 cursor-pointer">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                  <span className="text-[10px] text-white/50">댓글 {video.commentCount ?? 0}</span>
                </div>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-[#06060e] border-white/10 p-0 flex flex-col">
                <SheetHeader className="p-4 border-b border-white/10 text-left">
                  <SheetTitle className="text-white">댓글 {video.commentCount ?? 0}개</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4">
                  <VideoComments videoId={video.id} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex flex-col items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => handleShare(video.title)}
                title="공유"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <span className="text-[10px] text-white/50">공유</span>
            </div>

            <ReportDialog targetType="VIDEO" targetId={video.id}>
              <div className="flex flex-col items-center gap-1 cursor-pointer">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  title="신고"
                >
                  <Flag className="h-5 w-5" />
                </Button>
                <span className="text-[10px] text-white/50">신고</span>
              </div>
            </ReportDialog>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/30">
      <span className="text-violet-400">{icon}</span>
      {title}
    </h2>
  );
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/25">{label}</p>
      <p className="truncate text-sm font-semibold text-white/70" title={value}>
        {value}
      </p>
    </div>
  );
}

function QuickInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/30">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium text-white/60">{value}</span>
    </div>
  );
}


