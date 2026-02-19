"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Play } from "lucide-react";

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
};

/** Static thumbnail URL */
function getStaticThumb(streamUid: string | null, thumbnailUrl: string | null): string | null {
  if (streamUid) return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?width=480&height=270&fit=crop`;
  return thumbnailUrl;
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

export function VideoCard({
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
}: VideoCardProps) {
  const thumb = getStaticThumb(streamUid, thumbnailUrl);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setIsHovered(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  }, []);

  const showAnimated = isHovered && !!streamUid;

  return (
    <Link
      href={`/videos/${id}`}
      className={`group block ${compact ? "w-[280px] shrink-0 snap-start sm:w-[320px]" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {thumb && !thumbFailed ? (
            <>
              {/* Static thumbnail (always rendered) */}
               <Image
                 src={thumb}
                 alt={title}
                 fill
                 sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                 className={`object-cover transition-all duration-500 ${showAnimated ? "opacity-0" : "opacity-100 group-hover:scale-105"}`}
                 onError={() => setThumbFailed(true)}
                 priority={priority}
               />
               {/* Animated GIF (shown on hover) */}
               {showAnimated && streamUid && (
                 <Image
                   src={getAnimatedThumb(streamUid)}
                   alt={`${title} 미리보기`}
                   fill
                   sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                   className="object-cover"
                 />
               )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-violet-100 to-indigo-100 dark:from-violet-900/20 dark:to-indigo-900/20">
              <span className="text-4xl opacity-40">🎬</span>
            </div>
          )}

          {/* Duration badge */}
          {duration ? (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </div>
          ) : null}

          {/* Hover play icon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/80 text-white shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
              <Play className="h-5 w-5 fill-current pl-0.5" />
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Info */}
        <div className={compact ? "p-2.5" : "p-3"}>
          <h3 className={`line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover:text-violet-600 dark:group-hover:text-violet-400 ${compact ? "text-xs" : "text-sm"}`}>
            {title}
          </h3>
          <div className={`mt-1.5 flex items-center gap-2 text-muted-foreground ${compact ? "text-[10px]" : "text-xs"}`}>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{ownerName}</span>
            </div>
            {categoryName && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {categoryName}
              </Badge>
            )}
          </div>
          {!compact && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/60">
              {new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }).format(new Date(createdAt))}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
