"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Play, Eye } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from "framer-motion";

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
  viewCount,
}: VideoCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const thumb = getStaticThumb(streamUid, thumbnailUrl);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V3 Framer Motion 3D Tilt values
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [0, 1], [6, -6]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-6, 6]);

  const bgX = useTransform(mouseXSpring, v => `${v * 100}%`);
  const bgY = useTransform(mouseYSpring, v => `${v * 100}%`);
  const glowBackground = useMotionTemplate`radial-gradient(circle at ${bgX} ${bgY}, rgba(139, 92, 246, 0.15) 0%, transparent 60%)`;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);
  }, [x, y]);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setIsHovered(true), 300);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
    // Reset 3D Tilt
    x.set(0.5);
    y.set(0.5);
  }, [x, y]);

  const showAnimated = isHovered && !!streamUid;

  return (
    <Link
      href={`/videos/${id}`}
      className={`group block relative outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${compact ? "w-[280px] shrink-0 snap-start sm:w-[320px]" : "w-full"}`}
      style={{ perspective: 1200 }} // Needed for 3D perspective
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/5 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.08] hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:border-white/20 hover:z-50 will-change-transform"
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={mounted ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
      >
        {/* V3 Mouse Tracking Glow Layer */}
        {mounted && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-screen dark:mix-blend-lighten"
            style={{ background: glowBackground }}
          />
        )}

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted" style={{ transform: 'translateZ(20px)' }}> {/* Push content forward */}
          {thumb && !thumbFailed ? (
            <>
              {/* Static thumbnail (always rendered) */}
              <Image
                src={thumb}
                alt={title}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${showAnimated ? "opacity-0" : "opacity-100 group-hover:scale-[1.03]"}`}
                onError={() => setThumbFailed(true)}
                priority={priority}
              />
              {/* Animated GIF (shown on hover) */}
              {showAnimated && streamUid && (
                <Image
                  src={getAnimatedThumb(streamUid)}
                  alt={`${title} 미리보기`}
                  fill
                  unoptimized
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

          {/* Hover play icon (Pushed forward more for depth) */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ transform: 'translateZ(40px)' }}>
            <div className="flex h-14 w-14 scale-50 items-center justify-center rounded-full bg-violet-600/90 text-white shadow-[0_0_30px_rgba(139,92,246,0.6)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 will-change-transform">
              <Play className="h-6 w-6 fill-current pl-1" />
            </div>
          </div>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10" />
        </div>

        {/* Info - Pushed forward for 3D effect */}
        <div className={`relative z-20 bg-gradient-to-t from-black via-zinc-900/90 to-zinc-900/0 ${compact ? "p-3" : "p-4"}`} style={{ transform: 'translateZ(15px)' }}>
          <h3 className={`line-clamp-2 font-extrabold leading-snug tracking-tight text-white transition-colors group-hover:text-violet-400 ${compact ? "text-xs" : "text-base sm:text-lg"}`}>
            {title}
          </h3>

          {/* Metadata container - slides up and fades in on hover */}
          <div className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] max-h-0 opacity-0 group-hover:max-h-[80px] group-hover:opacity-100 group-hover:mt-3">
            <div className={`flex items-center gap-2 text-zinc-300 ${compact ? "text-[10px]" : "text-xs font-medium"}`}>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2 py-1 backdrop-blur-md">
                <User className="h-3.5 w-3.5 text-violet-300" />
                <span className="truncate max-w-[120px]">{ownerName}</span>
              </div>
              {categoryName && (
                <Badge variant="secondary" className="h-6 px-2.5 text-[10px] sm:text-xs bg-violet-500/20 text-violet-200 border border-violet-500/30">
                  {categoryName}
                </Badge>
              )}
            </div>

            <div className={`mt-2.5 flex items-center justify-between font-medium text-zinc-500 ${compact ? "text-[10px]" : "text-[11px]"}`}>
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
      </motion.div>
    </Link>
  );
}
