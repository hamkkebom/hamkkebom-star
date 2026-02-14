"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayer } from "@/components/video/video-player";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Film,
  HardDrive,
  Heart,
  Monitor,
  Music,
  Play,
  Share2,
  Tag,
  Tv,
  Video,
} from "lucide-react";

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
};

type RelatedVideo = {
  id: string;
  title: string;
  streamUid: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  owner: { name: string; chineseName?: string | null };
  technicalSpec: { duration: number | null } | null;
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
    navigator.share({ title, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(window.location.href);
  }
}

/* ════════════════════════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════════════════════ */
export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery<{ data: VideoDetail }>({
    queryKey: ["video-detail", id],
    queryFn: () => fetch(`/api/videos/${id}`).then((r) => r.json()),
    enabled: !!id,
  });



  /* ─── Loading ─── */
  if (isLoading) return <LoadingSkeleton />;

  /* ─── Error / Not found ─── */
  if (error || !data?.data) {
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

  const video = data.data;
  const spec = video.technicalSpec;
  const status = statusConfig[video.status] || { label: video.status, className: "" };



  return (
    <div className="relative min-h-screen bg-[#06060e] text-white">
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
          {/* Floating back button */}
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

          {/* Video Player */}
          <div className="w-full max-h-[80vh] overflow-hidden flex items-center justify-center">
            {video.streamUid ? (
              <VideoPlayer streamUid={video.streamUid} />
            ) : video.thumbnailUrl || video.streamUid ? (
              <div className="relative h-full w-full">
                <Image
                   src={
                     video.streamUid
                       ? `https://videodelivery.net/${video.streamUid}/thumbnails/thumbnail.jpg?width=1280&height=720&fit=crop`
                       : video.thumbnailUrl!
                   }
                   alt={video.title}
                   fill
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

        {/* Bottom gradient fade from player into content */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#06060e] to-transparent" />
      </section>

      {/* ═══════════════ Content ═══════════════ */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Title Row ── */}
        <div className="-mt-12 relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
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
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/10 text-white/50 hover:border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-400"
              title="좋아요"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full border border-white/10 text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white"
              onClick={() => handleShare(video.title)}
              title="공유"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Two-Column Layout ── */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column — Main content */}
          <div className="space-y-10">
            {/* Description */}
            {video.description && (
              <section>
                <SectionHeader icon={<Film className="h-4 w-4" />} title="제작의도 / 설명" />
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
                  <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-white/70">
                    {video.description}
                  </p>
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
                <SectionHeader icon={<Monitor className="h-4 w-4" />} title="기술 스펙" />
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm">
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
          </div>

          {/* Right Column — Sidebar (프로필&다른작품보기, 상담사 숨김) */}
          <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            {/* Quick info card */}
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
            </div>
          </aside>
        </div>

        {/* 관련 영상 — 숨김 처리 */}

        {/* ── Bottom Nav ── */}
        <div className="mt-16 border-t border-white/[0.06] pb-16 pt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/60 transition-all hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-300"
          >
            <ArrowLeft className="h-4 w-4" />
            영상 목록으로 돌아가기
          </Link>
        </div>
      </div>
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

/* ─── Loading skeleton ─── */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#06060e]">
      {/* Player skeleton */}
      <div className="mx-auto max-w-7xl">
        <Skeleton className="aspect-video w-full bg-white/5" />
      </div>
      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 bg-white/5" />
          <Skeleton className="h-10 w-2/3 bg-white/5" />
          <Skeleton className="h-4 w-1/3 bg-white/5" />
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
            <Skeleton className="h-60 w-full rounded-2xl bg-white/5" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
            <Skeleton className="h-32 w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
