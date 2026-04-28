/**
 * 영상 다중 프레임 perceptual hash 유틸
 *
 * Cloudflare Stream 썸네일 URL의 ?time=Xs 파라미터로
 * 여러 시점의 프레임을 가져와 sharp-phash로 64-bit 해시를 계산합니다.
 *
 * - 비용: 기본 썸네일 추출은 무료, 무제한 (스프라이트시트 미사용)
 * - 정확도: 단일 프레임보다 ↑ — 인트로 화면이 비슷해도 본편이 다르면 구분 가능
 */

import sharp from "sharp";
import phash from "sharp-phash";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";

const FRAME_PERCENTS = [0.1, 0.25, 0.5, 0.75, 0.9] as const;
const FRAME_FALLBACK_SECONDS = [2, 10, 30, 60, 120] as const;
const HASH_HEX_LEN = 16; // 64-bit hash = 16 hex chars

/**
 * sharp-phash가 반환하는 binary 문자열(64자리 0/1)을 16자리 hex로 압축
 */
function binaryToHex(bin: string): string {
  let hex = "";
  for (let i = 0; i < bin.length; i += 4) {
    hex += parseInt(bin.slice(i, i + 4), 2).toString(16);
  }
  return hex.padStart(HASH_HEX_LEN, "0");
}

function hexToBin(hex: string): string {
  let bin = "";
  for (const c of hex) {
    bin += parseInt(c, 16).toString(2).padStart(4, "0");
  }
  return bin;
}

/**
 * 두 64-bit hash(hex 16자리)의 Hamming distance
 */
function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return 64;
  const binA = hexToBin(hexA);
  const binB = hexToBin(hexB);
  let dist = 0;
  for (let i = 0; i < binA.length; i++) {
    if (binA[i] !== binB[i]) dist++;
  }
  return dist;
}

/**
 * Cloudflare Stream에서 특정 시점의 썸네일을 받아와 perceptual hash 계산
 */
async function fetchFrameHash(token: string, seconds: number): Promise<string | null> {
  const url = `https://videodelivery.net/${token}/thumbnails/thumbnail.jpg?time=${seconds}s&width=320&height=180`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // sharp으로 정규화 후 phash
    const normalized = await sharp(buffer)
      .grayscale()
      .resize(32, 32, { fit: "fill" })
      .toBuffer();
    const bin = await phash(normalized);
    return binaryToHex(bin);
  } catch (err) {
    console.error(`[video-phash] frame ${seconds}s 실패:`, err);
    return null;
  }
}

/**
 * 영상의 5개 프레임 hash를 계산하여 콤마로 join한 문자열 반환
 *
 * @param streamUid Cloudflare Stream uid
 * @param durationSeconds 영상 길이 (없으면 fallback 시점 사용)
 * @returns "hash1,hash2,hash3,hash4,hash5" 또는 null (실패 시)
 */
export async function computeVideoPhash(
  streamUid: string,
  durationSeconds: number | null
): Promise<string | null> {
  const token = await getSignedPlaybackToken(streamUid);
  if (!token) return null;

  const timestamps =
    durationSeconds && durationSeconds > 5
      ? FRAME_PERCENTS.map((p) => Math.max(1, Math.floor(durationSeconds * p)))
      : [...FRAME_FALLBACK_SECONDS];

  const hashes = await Promise.all(timestamps.map((s) => fetchFrameHash(token, s)));
  const valid = hashes.filter((h): h is string => h !== null);
  if (valid.length === 0) return null;
  return valid.join(",");
}

/**
 * 두 영상의 프레임 hash 집합 간 최소 Hamming distance를 반환
 *
 * - 모든 프레임 쌍을 비교하고 최소값 반환
 * - 두 영상이 같은 시점에 정확히 같지 않더라도, 어느 한 시점이라도 매우 비슷하면 유사로 판정
 */
export function compareVideoPhash(phashA: string, phashB: string): number {
  const arrA = phashA.split(",").filter((s) => s.length === HASH_HEX_LEN);
  const arrB = phashB.split(",").filter((s) => s.length === HASH_HEX_LEN);
  if (arrA.length === 0 || arrB.length === 0) return 64;

  let minDist = 64;
  for (const a of arrA) {
    for (const b of arrB) {
      const d = hammingDistance(a, b);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

/**
 * 두 영상이 시각적으로 유사한지 판정 (threshold 기본 12)
 * - 0~5: 거의 동일
 * - 6~12: 매우 비슷 (수정본 가능성 높음)
 * - 13~20: 약간 비슷
 * - 21+: 다른 영상
 */
export function isVisuallySimilar(
  phashA: string,
  phashB: string,
  threshold = 12
): boolean {
  return compareVideoPhash(phashA, phashB) <= threshold;
}
