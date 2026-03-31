/**
 * 영상 썸네일 URL 해석 유틸리티.
 *
 * 우선순위:
 * 1. R2 URL (pub-r2.hamkkebom.com) → presigned GET URL 생성 (커스텀 썸네일 우선)
 * 2. 외부 공개 URL (airtable 등) → 그대로 반환 (즉시)
 * 3. CF Stream → signed token 기반 썸네일 (인메모리 캐시 50분)
 *
 * 최적화:
 * - R2 URL은 presigned GET URL로 변환 (pub-r2 도메인 DNS 미해석 대응)
 * - Stream signed token 인메모리 캐시 (50분 TTL)
 * - 캐시 히트 시 외부 API 호출 0건
 */
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { extractR2Key, getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

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
 * URL이 R2 공개 도메인 (pub-r2.hamkkebom.com) URL인지 판별합니다.
 * DNS가 해석되지 않으므로 직접 접근 불가 → presigned URL 변환 필요.
 */
function isR2PublicUrl(url: string): boolean {
  try {
    return new URL(url).hostname === R2_PUBLIC_DOMAIN;
  } catch {
    return false;
  }
}

/**
 * URL이 서명 없이 바로 접근 가능한 공개 URL인지 판별합니다.
 * airtable, 일반 이미지 호스팅 등. R2 공개 도메인은 DNS 불가이므로 제외.
 */
function isPublicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    // R2 공개 도메인은 DNS 해석 불가 → presigned URL로 별도 처리
    if (host === R2_PUBLIC_DOMAIN) return false;
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
 * 1. thumbnailUrl이 R2 URL → presigned GET URL 생성 (커스텀 썸네일 우선)
 * 2. thumbnailUrl이 공개 URL → 그대로 반환 (airtable 등)
 * 3. Cloudflare Stream → signed playback token 기반 썸네일 (캐시 적용)
 * 4. unsigned fallback
 */
export async function resolveSignedThumbnail(
  thumbnailUrl: string | null,
  streamUid: string | null,
): Promise<string | null> {
  // 1순위: R2 URL → presigned GET URL (유저 업로드 커스텀 썸네일)
  if (thumbnailUrl && isR2PublicUrl(thumbnailUrl)) {
    const r2Key = extractR2Key(thumbnailUrl);
    if (r2Key) {
      try {
        return await getPresignedGetUrl(r2Key, 6 * 3600); // 6시간 TTL
      } catch { /* R2 presign 실패 → CF Stream 폴백 */ }
    }
  }

  // 2순위: 공개 URL → 그대로 반환 (airtable 등 — 서명 불필요)
  if (thumbnailUrl && isPublicUrl(thumbnailUrl)) {
    return thumbnailUrl;
  }

  // 3순위: Cloudflare Stream signed token (캐시 우선)
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
    videos.map(async (v) => {
      const signed = await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid);
      return {
        ...v,
        thumbnailUrl: signed || v.thumbnailUrl,
        signedThumbnailUrl: signed,
      };
    }),
  );
}
