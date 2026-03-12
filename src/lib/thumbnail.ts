/**
 * 영상 썸네일 URL 서명 유틸리티.
 *
 * R2 presigned URL 또는 Cloudflare Stream signed token으로
 * 브라우저에서 접근 가능한 썸네일 URL을 생성합니다.
 */
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { getPresignedGetUrl } from "@/lib/cloudflare/r2-upload";

/** R2 URL에서 오브젝트 키 추출 */
function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url);
    // r2.cloudflarestorage.com/bucket/key 형태
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts.slice(1).join("/") : parts.join("/");
  } catch {
    return null;
  }
}

/**
 * 영상의 서명된 썸네일 URL을 생성합니다.
 *
 * 우선순위:
 * 1. R2 thumbnailUrl → presigned GET URL
 * 2. Cloudflare Stream → signed playback token 기반 썸네일
 * 3. Cloudflare Stream → unsigned fallback (requireSignedURLs 미설정 영상)
 */
export async function resolveSignedThumbnail(
  thumbnailUrl: string | null,
  streamUid: string | null,
): Promise<string | null> {
  // 1순위: R2 thumbnailUrl → presigned URL
  if (thumbnailUrl) {
    const r2Key = extractR2Key(thumbnailUrl);
    if (r2Key) {
      try {
        return await getPresignedGetUrl(r2Key);
      } catch { /* R2 실패 시 fallback */ }
    }
  }

  // 2순위: Cloudflare Stream signed token
  if (streamUid) {
    try {
      const token = await getSignedPlaybackToken(streamUid);
      if (token) {
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
