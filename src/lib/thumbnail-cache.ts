/**
 * CF Stream 썸네일 → R2 공개 버킷 캐싱 유틸리티.
 *
 * 영상 승인 시 또는 관리자 배치 실행으로 호출.
 * 1. CF Stream에서 signed 토큰으로 썸네일 다운로드
 * 2. R2 공개 버킷에 업로드 (thumbnails/{videoId}.jpg)
 * 3. Video.thumbnailUrl을 R2 공개 URL로 업데이트
 *
 * 이후 resolveSignedThumbnail()이 pub-r2.hamkkebom.com URL을
 * 공개 URL로 인식 → CF API 호출 0건, 즉시 반환.
 */
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";
import { uploadBuffer } from "@/lib/cloudflare/r2-upload";
import { prisma } from "@/lib/prisma";

const THUMB_WIDTH = 640;
const THUMB_HEIGHT = 360;

/**
 * 단일 영상의 CF Stream 썸네일을 R2에 캐싱합니다.
 *
 * @param videoId - 영상 DB ID
 * @param streamUid - Cloudflare Stream UID
 * @returns R2 공개 URL 또는 null (실패 시)
 */
export async function cacheVideoThumbnail(
  videoId: string,
  streamUid: string,
): Promise<string | null> {
  try {
    // 1. CF Stream signed token 발급
    const token = await getSignedPlaybackToken(streamUid);
    const thumbUrl = token
      ? `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=1s&width=${THUMB_WIDTH}&height=${THUMB_HEIGHT}&fit=crop`
      : `https://videodelivery.net/${streamUid}/thumbnails/thumbnail.jpg?time=1s&width=${THUMB_WIDTH}&height=${THUMB_HEIGHT}&fit=crop`;

    // 2. 썸네일 다운로드
    const res = await fetch(thumbUrl);
    if (!res.ok) {
      console.error(`[thumbnail-cache] 다운로드 실패 (${videoId}): ${res.status}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";

    // 3. R2에 업로드
    const r2Key = `thumbnails/${videoId}.jpg`;
    const publicUrl = await uploadBuffer(r2Key, buffer, contentType);
    if (!publicUrl) {
      console.error(`[thumbnail-cache] R2 업로드 실패 (${videoId})`);
      return null;
    }

    // 4. DB 업데이트
    await prisma.video.update({
      where: { id: videoId },
      data: { thumbnailUrl: publicUrl },
    });

    return publicUrl;
  } catch (error) {
    console.error(`[thumbnail-cache] 캐싱 실패 (${videoId}):`, error);
    return null;
  }
}

/**
 * 여러 영상의 썸네일을 배치로 R2에 캐싱합니다.
 * 동시 처리 제한 (concurrency)으로 CF API rate limit 방지.
 *
 * @param concurrency - 동시 처리 수 (기본 5)
 * @returns 성공/실패 카운트
 */
export async function batchCacheThumbnails(
  concurrency = 5,
): Promise<{ success: number; failed: number; skipped: number; total: number }> {
  // R2에 아직 캐싱되지 않은 영상 조회
  // thumbnailUrl이 null이거나 R2 도메인이 아닌 영상
  const videos = await prisma.video.findMany({
    where: {
      streamUid: { not: null },
      status: { in: ["APPROVED", "FINAL"] },
      OR: [
        { thumbnailUrl: null },
        { thumbnailUrl: { not: { contains: "pub-r2.hamkkebom.com" } } },
      ],
    },
    select: { id: true, streamUid: true },
  });

  let success = 0;
  let failed = 0;
  let skipped = 0;

  // concurrency 제한 병렬 처리
  for (let i = 0; i < videos.length; i += concurrency) {
    const batch = videos.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((v) => {
        if (!v.streamUid) {
          skipped++;
          return Promise.resolve(null);
        }
        return cacheVideoThumbnail(v.id, v.streamUid);
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        success++;
      } else if (result.status === "rejected") {
        failed++;
      }
    }
  }

  return { success, failed, skipped, total: videos.length };
}
