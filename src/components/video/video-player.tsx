"use client";

import { useRef, useEffect, useState } from "react";

interface VideoPlayerProps {
  /** Cloudflare Stream UID — 서명된 토큰으로 iframe embed 사용 */
  streamUid?: string;
  /**
   * HLS 재생 URL 또는 일반 영상 URL (streamUid가 없을 때 fallback).
   */
  src?: string;
  /** 현재 재생 시간(초)이 변경될 때 호출 */
  onTimeUpdate?: (currentTime: number) => void;
  /** 비디오 총 시간(초) */
  onDurationChange?: (duration: number) => void;
  /** 외부에서 특정 시점으로 이동할 때 사용 */
  seekTo?: number;
}

export function VideoPlayer({ streamUid, src, onTimeUpdate, onDurationChange, seekTo }: VideoPlayerProps) {
  const [state, setState] = useState<{
    embedUrl: string | null;
    loading: boolean;
    error: string | null;
  }>({ embedUrl: null, loading: !!streamUid, error: null });

  // streamUid가 있으면 서명된 토큰 발급
  useEffect(() => {
    if (!streamUid) return;

    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch(`/api/videos/stream-token?uid=${encodeURIComponent(streamUid!)}`);
        if (!res.ok) throw new Error("토큰 발급 실패");
        const json = (await res.json()) as { data: { embedUrl: string } };
        if (!cancelled) {
          setState({ embedUrl: json.data.embedUrl, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ embedUrl: null, loading: false, error: err instanceof Error ? err.message : "영상을 불러올 수 없습니다." });
        }
      }
    }

    fetchToken();

    return () => { cancelled = true; };
  }, [streamUid]);

  const { embedUrl, loading, error } = state;

  // Cloudflare Stream iframe embed 모드
  if (streamUid) {
    if (loading) {
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black">
          <div className="flex items-center gap-2 text-white/60">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">영상 로딩중...</span>
          </div>
        </div>
      );
    }

    if (error || !embedUrl) {
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <p className="text-sm">{error || "영상을 불러올 수 없습니다."}</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          className="aspect-video w-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // HLS/직접 URL 모드 (fallback)
  return <HlsVideoPlayer src={src || ""} seekTo={seekTo} onTimeUpdate={onTimeUpdate} onDurationChange={onDurationChange} />;
}

/** HLS.js 기반 비디오 플레이어 (fallback) */
function HlsVideoPlayer({
  src,
  onTimeUpdate,
  onDurationChange,
  seekTo,
}: {
  src: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  seekTo?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hlsInstance: { destroy: () => void } | null = null;

    async function setupHls() {
      if (!video) return;

      if (src.endsWith(".m3u8") || src.includes("manifest/video")) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src;
        } else {
          try {
            const Hls = (await import("hls.js")).default;
            if (Hls.isSupported()) {
              const hls = new Hls();
              hls.loadSource(src);
              hls.attachMedia(video);
              hlsInstance = hls;
            } else {
              video.src = src;
            }
          } catch {
            video.src = src;
          }
        }
      } else {
        video.src = src;
      }
    }

    setupHls();

    return () => {
      hlsInstance?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && seekTo !== undefined && Number.isFinite(seekTo)) {
      video.currentTime = seekTo;
    }
  }, [seekTo]);

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="aspect-video w-full"
        controls
        playsInline
        onTimeUpdate={() => {
          if (videoRef.current) {
            onTimeUpdate?.(videoRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) {
            onDurationChange?.(videoRef.current.duration);
          }
        }}
      />
    </div>
  );
}
