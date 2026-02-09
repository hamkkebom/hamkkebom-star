"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  /**
   * HLS 재생 URL 또는 일반 영상 URL.
   * Cloudflare Stream의 경우: https://customer-xxx.cloudflarestream.com/{uid}/manifest/video.m3u8
   */
  src: string;
  /** 현재 재생 시간(초)이 변경될 때 호출 */
  onTimeUpdate?: (currentTime: number) => void;
  /** 비디오 총 시간(초) */
  onDurationChange?: (duration: number) => void;
  /** 외부에서 특정 시점으로 이동할 때 사용 */
  seekTo?: number;
}

export function VideoPlayer({ src, onTimeUpdate, onDurationChange, seekTo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // HLS.js 동적 로드 (클라이언트에서만)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hlsInstance: { destroy: () => void } | null = null;

    async function setupHls() {
      if (!video) return;

      if (src.endsWith(".m3u8") || src.includes("manifest/video")) {
        // HLS 스트림
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari 네이티브 HLS
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
            // hls.js 로드 실패 시 직접 재생 시도
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

  // seekTo 변경 시 이동
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
