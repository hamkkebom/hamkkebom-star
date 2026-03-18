/**
 * 영상 썸네일 URL 해석 유틸리티.
 *
 * 우선순위:
 * 1. R2 공개 URL (pub-r2.hamkkebom.com) → 그대로 반환 (서명 불필요, 즉시)
 * 2. 외부 공개 URL (airtable 등) → 그대로 반환 (즉시)
 * 3. CF Stream → signed token 기반 썸네일 (인메모리 캐시 50분)
 *
 * 최적화:
 * - R2 공개 URL은 서명 없이 바로 반환 → CF API 호출 0건
 * - Stream signed token 인메모리 캐시 (50분 TTL)
 * - 캐시 히트 시 외부 API 호출 0건
 */
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";

const R2_PUBLIC_DOMAIN = "pub-r2.hamkkebom.com";

/* ─── Stream Token 인메모리 캐시 ─── */
const TOKEN_TTL_MS = 50 * 60 * 1000; // 50분 (토큰 유효기간 1시간보다 여유 10분)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function getCachedToken(uid: string): string | null {
  const entry = tokenCache.get(uid);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenCache.delete(uid);
    return null;
  }
  return entry.token;
}

function setCachedToken(uid: string, token: string): void {
  tokenCache.set(uid, { token, expiresAt: Date.now() + TOKEN_TTL_MS });

  // 캐시 크기 제한 (1000개 초과 시 만료된 항목 정리)
  if (tokenCache.size > 1000) {
    const now = Date.now();
    for (const [key, entry] of tokenCache) {
      if (now > entry.expiresAt) tokenCache.delete(key);
    }
  }
}

/**
 * URL이 서명 없이 바로 접근 가능한 공개 URL인지 판별합니다.
 * R2 공개 버킷, airtable, 일반 이미지 호스팅 등.
 */
function isPublicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    // videodelivery.net은 requireSignedURLs 때문에 공개 아님
    // r2.cloudflarestorage.com은 private endpoint
    return host !== "videodelivery.net" && !host.includes("r2.cloudflarestorage.com");
  } catch {
    return false;
  }
}

/**
 * 영상의 접근 가능한 썸네일 URL을 생성합니다.
 *
 * 우선순위:
 * 1. thumbnailUrl이 공개 URL → 그대로 반환 (R2 public, airtable 등)
 * 2. Cloudflare Stream → signed playback token 기반 썸네일 (캐시 적용)
 * 3. unsigned fallback
 */
export async function resolveSignedThumbnail(
  thumbnailUrl: string | null,
  streamUid: string | null,
): Promise<string | null> {
  // 1순위: 공개 URL → 그대로 반환 (R2 public, airtable 등 — 서명 불필요)
  if (thumbnailUrl && isPublicUrl(thumbnailUrl)) {
    return thumbnailUrl;
  }

  // 2순위: Cloudflare Stream signed token (캐시 우선)
  if (streamUid) {
    const cachedToken = getCachedToken(streamUid);
    if (cachedToken) {
      return `https://videodelivery.net/${cachedToken}/thumbnails/thumbnail.jpg?time=1s&width=640`;
    }

    try {
      const token = await getSignedPlaybackToken(streamUid);
      if (token) {
        setCachedToken(streamUid, token);
        return `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=640`;
      }
    } catch { /* ignore */ }

    // unsigned fallback
    return `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?time=1s&width=640`;
  }

  return null;
}

/**
 * 영상 배열에 signedThumbnailUrl 필드를 추가합니다.
 * 병렬로 처리하여 성능 최적화.
 */
export async function addSignedThumbnails<T extends { thumbnailUrl: string | null; streamUid: string | null }>(
  videos: T[],
): Promise<(T & { signedThumbnailUrl: string | null })[]> {
  return Promise.all(
    videos.map(async (v) => ({
      ...v,
      signedThumbnailUrl: await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid),
    })),
  );
}
