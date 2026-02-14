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

    const uid = streamUid;
    let cancelled = false;

    async function fetchToken() {
      try {
        const res = await fetch(`/api/videos/stream-token?uid=${encodeURIComponent(uid)}`);
        if (!res.ok) throw new Error("토큰 발급 실패");

        const json = (await res.json()) as StreamTokenResponse;
        const token = json.data.token;
        if (!token) throw new Error("토큰 발급 실패");

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
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <p className="text-sm">{error || "영상을 불러올 수 없습니다."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-h-[80vh] overflow-hidden rounded-xl bg-black [&>stream]:!max-h-[80vh] [&_iframe]:!max-h-[80vh]">
      <Stream
        src={playbackSrc}
        streamRef={streamRef}
        controls
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
