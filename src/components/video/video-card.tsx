"use client";

import { memo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Play, Eye } from "lucide-react";

type VideoCardProps = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  streamUid: string | null;
  duration: number | null;
  ownerName: string;
  categoryName: string | null;
  createdAt: string;
  /** When true, renders a compact card for swimlane layout */
  compact?: boolean;
  /** When true, loads image eagerly (use for above-the-fold LCP images) */
  priority?: boolean;
  /** View count for the video */
  viewCount?: number;
};

/** Static thumbnail URL — 커스텀 썸네일(API에서 서명된 URL)을 CF Stream 자동 캡쳐보다 우선 */
function getStaticThumb(streamUid: string | null, thumbnailUrl: string | null): string | null {
  // 커스텀 썸네일 우선 (API에서 presigned/signed URL로 변환되어 옴)
  if (thumbnailUrl) return thumbnailUrl;
  // CF Stream 자동 썸네일 폴백
  if (streamUid) return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?width=480&height=270&fit=crop`;
  return null;
}

/** Animated GIF preview URL (Cloudflare Stream) */
function getAnimatedThumb(streamUid: string): string {
  return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.gif?duration=4s&width=480&height=270&fit=crop`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VideoCard = memo(function VideoCard({
  id,
  title,
  thumbnailUrl,
  streamUid,
  duration,
  ownerName,
  categoryName,
  createdAt,
  compact = false,
  priority = false,
  viewCount,
}: VideoCardProps) {
  const thumb = getStaticThumb(streamUid, thumbnailUrl);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // CSS 3D tilt via mouse position → CSS custom properties
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(y - 0.5) * -12}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
    el.style.setProperty("--glow-x", `${x * 100}%`);
    el.style.setProperty("--glow-y", `${y * 100}%`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setIsHovered(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
    const el = cardRef.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  }, []);

  const showAnimated = isHovered && !!streamUid;

  return (
    <Link
      href={`/videos/${id}`}
      className={`group block relative outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${compact ? "w-[280px] shrink-0 snap-start sm:w-[320px]" : "w-full"}`}
      style={{ perspective: 1200 }}
    >
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-md dark:shadow-none hover:scale-[1.08] hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] dark:hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:border-black/20 dark:hover:border-white/20 hover:z-50 will-change-transform"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out, scale 0.5s cubic-bezier(0.25,1,0.5,1), box-shadow 0.5s cubic-bezier(0.25,1,0.5,1), border-color 0.5s",
        }}
      >
        {/* Mouse Tracking Glow Layer — pure CSS */}
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 mix-blend-screen dark:mix-blend-lighten transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(139, 92, 246, 0.15) 0%, transparent 60%)",
          }}
        />

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted" style={{ transform: 'translateZ(20px)' }}>
          {thumb && !thumbFailed ? (
            <>
              {/* Static thumbnail (always rendered) */}
              <Image
                src={thumb}
                alt={title}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={`object-cover transition-transform duration-300 ease-out will-change-transform ${showAnimated ? "opacity-0" : "opacity-100 group-hover:scale-[1.03]"}`}
                onError={() => setThumbFailed(true)}
                priority={priority}
              />
              {/* Animated GIF (shown on hover after 300ms) */}
              {showAnimated && streamUid && (
                <Image
                  src={getAnimatedThumb(streamUid)}
                  alt={`${title} 미리보기`}
                  fill
                  unoptimized
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20">
              <span className="text-4xl opacity-40">🎬</span>
            </div>
          )}

          {/* View count badge (top right) */}
          {viewCount !== undefined ? (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 border border-white/10 shadow-lg px-2 py-1 text-[11px] font-bold text-white backdrop-blur-md z-20 transition-all duration-300 group-hover:bg-violet-600/90 group-hover:border-violet-500/50">
              <Eye className="h-3 w-3" />
              {viewCount.toLocaleString()}
            </div>
          ) : null}

          {/* Duration badge */}
          {duration ? (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm z-20">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </div>
          ) : null}

          {/* Hover play icon */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ transform: 'translateZ(40px)' }}>
            <div className="flex h-14 w-14 scale-50 items-center justify-center rounded-full bg-violet-600/90 text-white shadow-[0_0_30px_rgba(139,92,246,0.6)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 will-change-transform">
              <Play className="h-6 w-6 fill-current pl-1" />
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />
        </div>

        {/* Info */}
        <div className={`relative z-20 bg-gradient-to-t from-white via-white/95 to-white/0 dark:from-black dark:via-zinc-900/90 dark:to-zinc-900/0 ${compact ? "p-3" : "p-4"}`} style={{ transform: 'translateZ(15px)' }}>
          <h3 className={`line-clamp-2 font-extrabold leading-snug tracking-tight text-foreground dark:text-white transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 ${compact ? "text-xs" : "text-base sm:text-lg"}`}>
            {title}
          </h3>

          {/* Metadata — always visible */}
          <div className="mt-3">
            <div className={`flex items-center gap-2 text-zinc-600 dark:text-zinc-300 ${compact ? "text-[10px]" : "text-xs font-medium"}`}>
              <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/10 rounded-full px-2 py-1 backdrop-blur-md">
                <User className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
                <span className="truncate max-w-[120px]">{ownerName}</span>
              </div>
              {categoryName && (
                <Badge variant="secondary" className="h-6 px-2.5 text-[10px] sm:text-xs bg-violet-500/20 text-violet-200 border border-violet-500/30">
                  {categoryName}
                </Badge>
              )}
            </div>

            <div className={`mt-2 flex items-center justify-between font-medium text-zinc-500 ${compact ? "text-[10px]" : "text-[11px]"}`}>
              <span>
                {new Intl.DateTimeFormat("ko-KR", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }).format(new Date(createdAt))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
