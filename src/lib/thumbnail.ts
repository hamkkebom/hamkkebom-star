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
import { extractR2Key, getPresignedGetUrl, isR2Url } from "@/lib/cloudflare/r2-upload";

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
 * airtable, 일반 이미지 호스팅 등. R2 공개 도메인은 DNS 불가이므로 제외.
 */
function isPublicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    // R2 공개 도메인은 presigned URL로 별도 처리 (isR2Url에서 처리)
    if (isR2Url(url)) return false;
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
 * ⚠️ 핵심 원칙: 유저가 업로드한 커스텀 썸네일(R2 URL)이 저장되어 있으면,
 *    presign이 실패해도 CF Stream 자동 썸네일로 폴백하지 않는다.
 *    (CF Stream 자동 썸네일은 영상의 1초 지점 프레임 = "화면 캡쳐본"처럼 보여
 *     유저가 업로드한 썸네일이 무시된 것처럼 오해됨)
 *
 * 우선순위:
 * 1. thumbnailUrl이 R2 URL → presigned GET URL 생성 (실패 시 null — CF 폴백 안 함)
 * 2. thumbnailUrl이 공개 URL → 그대로 반환 (airtable 등)
 * 3. thumbnailUrl이 없을 때만 → Cloudflare Stream 자동 썸네일 (캐시 적용)
 */
export async function resolveSignedThumbnail(
  thumbnailUrl: string | null,
  streamUid: string | null,
): Promise<string | null> {
  // 1순위: R2 URL → presigned GET URL (유저 업로드 커스텀 썸네일)
  if (thumbnailUrl && isR2Url(thumbnailUrl)) {
    const r2Key = extractR2Key(thumbnailUrl);
    if (r2Key) {
      try {
        return await getPresignedGetUrl(r2Key, 6 * 3600); // 6시간 TTL
      } catch (err) {
        console.error(`[thumbnail] R2 presign 실패 (${r2Key}):`, err);
        // ⚠️ 유저가 커스텀 썸네일을 올렸는데 CF Stream으로 폴백하면
        //    의도하지 않은 "화면 캡쳐본"이 표시됨 → null 반환으로 UI 플레이스홀더 사용
        return null;
      }
    }
    // R2 URL인데 키 추출 실패 — 스키마 손상. null 반환.
    console.warn(`[thumbnail] R2 키 추출 실패: ${thumbnailUrl}`);
    return null;
  }

  // 2순위: 공개 URL → 그대로 반환 (airtable 등 — 서명 불필요)
  if (thumbnailUrl && isPublicUrl(thumbnailUrl)) {
    return thumbnailUrl;
  }

  // 3순위: 커스텀 썸네일이 전혀 없을 때만 → CF Stream 자동 썸네일
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
 * 영상 배열에 signedThumbnailUrl 및 hasCustomThumbnail 필드를 추가합니다.
 * 병렬로 처리하여 성능 최적화.
 *
 * ⚠️ thumbnailUrl에 signed(= null 가능)를 그대로 넣음.
 *    signed가 null이면 원본 R2 URL(브라우저 DNS 불가)을 덮어쓰지 않도록 null을 남김.
 *    클라이언트는 signedThumbnailUrl이 null이면 플레이스홀더를 표시해야 함.
 *    (원본 R2 URL을 유지하면 브라우저가 로드 실패 → hover 시 CF Stream GIF로 대체되는 부작용)
 *
 * hasCustomThumbnail: 유저가 커스텀 썸네일을 업로드했음을 나타냄.
 *    true이면 클라이언트에서 CF Stream hover GIF도 차단해야 함.
 */
export async function addSignedThumbnails<T extends { thumbnailUrl: string | null; streamUid: string | null }>(
  videos: T[],
): Promise<(T & { signedThumbnailUrl: string | null; hasCustomThumbnail: boolean })[]> {
  return Promise.all(
    videos.map(async (v) => {
      const signed = await resolveSignedThumbnail(v.thumbnailUrl, v.streamUid);
      return {
        ...v,
        thumbnailUrl: signed,
        signedThumbnailUrl: signed,
        hasCustomThumbnail: v.thumbnailUrl !== null,
      };
    }),
  );
}
