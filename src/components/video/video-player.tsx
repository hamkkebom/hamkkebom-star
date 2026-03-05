"use client";

import { Stream } from "@cloudflare/stream-react";
import type { StreamPlayerApi } from "@cloudflare/stream-react";
import { memo, useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  /** Cloudflare Stream UID — 서명된 토큰으로 재생 */
  streamUid?: string;
  /** Cloudflare Stream src 또는 일반 영상 src fallback */
  src?: string;
  /** 현재 재생 시간(초)이 변경될 때 호출 */
  onTimeUpdate?: (currentTime: number) => void;
  /** 비디오 총 시간(초) */
  onDurationChange?: (duration: number) => void;
  /** 외부에서 특정 시점으로 이동할 때 사용 */
  seekTo?: number;
  /** 자동 재생 여부 */
  autoPlay?: boolean;
  /** 음소거 여부 */
  muted?: boolean;
  /** 반복 재생 여부 */
  loop?: boolean;
  /** 컨트롤 패널 표시 여부 */
  controls?: boolean;
  /** 커스텀 클래스 */
  className?: string;
}

type StreamTokenResponse = {
  data: {
    token?: string;
    hlsUrl?: string;
    embedUrl?: string;
  };
};

export const VideoPlayer = memo(function VideoPlayer({
  streamUid,
  src,
  onTimeUpdate,
  onDurationChange,
  seekTo,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className
}: VideoPlayerProps) {
  const streamRef = useRef<StreamPlayerApi>(undefined);
  const [state, setState] = useState<{
    playbackSrc: string | null;
    loading: boolean;
    error: string | null;
  }>({ playbackSrc: null, loading: !!streamUid, error: null });

  useEffect(() => {
    if (!streamUid) {
      setState({ playbackSrc: src ?? null, loading: false, error: null });
      return;
    }

    // Basic UID validation - reject obviously invalid UIDs (mock, test, etc.)
    if (streamUid.startsWith("mock-") || streamUid.startsWith("test-") || streamUid.length < 10) {
      setState({ playbackSrc: null, loading: false, error: "테스트 영상 (Cloudflare에 존재하지 않음)" });
      return;
    }

    const uid = streamUid;
    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch(`/api/videos/stream-token?uid=${encodeURIComponent(uid)}`);
        if (!res.ok) throw new Error("토큰 발급 실패");

        const json = (await res.json()) as StreamTokenResponse;
        const token = json.data.token;
        if (!token) throw new Error("영상을 찾을 수 없습니다.");

        if (!cancelled) {
          setState({ playbackSrc: token, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            playbackSrc: null,
            loading: false,
            error: err instanceof Error ? err.message : "영상을 불러올 수 없습니다.",
          });
        }
      }
    }

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, [streamUid, src]);

  useEffect(() => {
    if (seekTo !== undefined && Number.isFinite(seekTo) && streamRef.current) {
      streamRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  const { playbackSrc, loading, error } = state;

  if (loading) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-black">
        <div className="flex items-center gap-2 text-white/60">
          <svg aria-hidden="true" className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">영상 로딩중...</span>
        </div>
      </div>
    );
  }

  if (error || !playbackSrc) {
    return (
      <div className={className || "flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground"}>
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
          <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" /></svg>
          <p className="text-xs text-center opacity-60">{error || "영상을 불러올 수 없습니다."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className || "mx-auto w-full max-h-[80vh] rounded-xl bg-black [&>stream]:!max-h-[80vh] [&_iframe]:!max-h-[80vh]"}>
      <Stream
        src={playbackSrc}
        streamRef={streamRef}
        controls={controls}
        autoplay={autoPlay}
        muted={muted}
        loop={loop}
        responsive
        onTimeUpdate={() => {
          if (streamRef.current) {
            onTimeUpdate?.(streamRef.current.currentTime);
          }
        }}
        onLoadedMetaData={() => {
          if (streamRef.current) {
            onDurationChange?.(streamRef.current.duration);
          }
        }}
      />
    </div>
  );
});
