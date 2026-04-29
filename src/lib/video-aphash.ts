/**
 * 영상 오디오 perceptual hash 유틸
 *
 * Cloudflare Stream HLS에서 짧은 오디오 세그먼트를 받아
 * FFmpeg으로 PCM 디코딩 후 512-bit 차분(differential) 지문을 생성합니다.
 *
 * - 비용: HLS 스트리밍은 무료
 * - 정확도: 동일 소스 파일 재업로드, 미세한 재인코딩 변동에 강건
 * - 동일 영상 썸네일만 교체한 경우도 높은 확률로 감지 가능
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { getSignedPlaybackToken } from "@/lib/cloudflare/stream";

const execFileAsync = promisify(execFile);

const SAMPLE_RATE = 8000;       // 8kHz mono
const ANALYSIS_SECONDS = 8;    // 분석 구간 길이
const ANCHOR_COUNT = 513;       // 이 수 - 1 = 512 bit
const BITS_PER_UNIT = 64;       // 64-bit = 16 hex chars per hash unit
const NUM_UNITS = 8;            // 8 units = 512 bits 총 지문
const HASH_HEX_LEN = 16;

function getFfmpegPath(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("ffmpeg-static") as string;
}

function binaryStringToHex(bits: number[], start: number, len: number): string {
  let hex = "";
  for (let i = start; i < start + len; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex.padStart(len / 4, "0");
}

function pcmToAudioHash(rawPcm: Buffer): string {
  const totalInt16 = rawPcm.length / 2;
  const N = Math.min(totalInt16, SAMPLE_RATE * ANALYSIS_SECONDS);

  // 513개 균등 샘플 추출
  const anchors: number[] = [];
  for (let i = 0; i < ANCHOR_COUNT; i++) {
    const idx = Math.round((i / (ANCHOR_COUNT - 1)) * (N - 1));
    anchors.push(rawPcm.readInt16LE(idx * 2));
  }

  // 512 차분 비트: 다음 샘플이 크면 1, 작거나 같으면 0
  const bits: number[] = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    bits.push(anchors[i + 1] > anchors[i] ? 1 : 0);
  }

  // 8 그룹 × 64-bit → 16자리 hex
  const hashes: string[] = [];
  for (let u = 0; u < NUM_UNITS; u++) {
    hashes.push(binaryStringToHex(bits, u * BITS_PER_UNIT, BITS_PER_UNIT));
  }
  return hashes.join(",");
}

function hexToBin(hex: string): string {
  let bin = "";
  for (const c of hex) bin += parseInt(c, 16).toString(2).padStart(4, "0");
  return bin;
}

function hammingDistance(hexA: string, hexB: string): number {
  if (hexA.length !== hexB.length) return 64;
  const a = hexToBin(hexA);
  const b = hexToBin(hexB);
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

/**
 * HLS에서 오디오를 받아 512-bit 지문을 계산
 *
 * @param streamUid Cloudflare Stream uid
 * @param durationSeconds 영상 길이 (없으면 앞부분 분석)
 * @returns "hash1,hash2,...,hash8" 또는 null (실패 시)
 */
export async function computeVideoAphash(
  streamUid: string,
  durationSeconds: number | null
): Promise<string | null> {
  const token = await getSignedPlaybackToken(streamUid);
  if (!token) return null;

  const hlsUrl = `https://videodelivery.net/${token}/manifest/video.m3u8`;

  // 영상 중반부(20% 지점)부터 분석 (인트로 묵음 회피)
  const startTime =
    durationSeconds && durationSeconds > 20
      ? Math.floor(durationSeconds * 0.2)
      : 0;

  const tmpPcm = join(tmpdir(), `aphash-${streamUid}-${Date.now()}.raw`);

  try {
    const ffmpegPath = getFfmpegPath();

    await execFileAsync(
      ffmpegPath,
      [
        "-ss", String(startTime),
        "-i", hlsUrl,
        "-t", String(ANALYSIS_SECONDS),
        "-vn",                      // 영상 트랙 제외
        "-acodec", "pcm_s16le",    // 16-bit LE PCM
        "-ar", String(SAMPLE_RATE), // 8kHz
        "-ac", "1",                // 모노
        "-f", "s16le",             // raw format
        "-y",
        tmpPcm,
      ],
      { timeout: 40_000 }
    );

    const rawPcm = await readFile(tmpPcm);
    if (rawPcm.length < SAMPLE_RATE * 2) return null; // 1초 미만이면 실패

    return pcmToAudioHash(rawPcm);
  } catch (err) {
    console.error(`[video-aphash] ${streamUid} 실패:`, err);
    return null;
  } finally {
    await unlink(tmpPcm).catch(() => {});
  }
}

/**
 * 두 오디오 지문의 단위별 평균 Hamming distance
 * thumbnailPhash와 달리 시간 순서를 보존하는 unit-to-unit 비교
 */
export function compareVideoAphash(aphashA: string, aphashB: string): number {
  const arrA = aphashA.split(",").filter((s) => s.length === HASH_HEX_LEN);
  const arrB = aphashB.split(",").filter((s) => s.length === HASH_HEX_LEN);
  if (arrA.length === 0 || arrB.length === 0) return 64;

  const len = Math.min(arrA.length, arrB.length);
  let total = 0;
  for (let i = 0; i < len; i++) total += hammingDistance(arrA[i], arrB[i]);
  return Math.round(total / len);
}

/**
 * 두 영상의 오디오가 청각적으로 유사한지 판정 (threshold 기본 8)
 * - 0~4: 거의 동일
 * - 5~8: 매우 비슷 (동일 음원 가능성 높음)
 * - 9~16: 약간 비슷
 * - 17+: 다른 음원
 */
export function isAudioSimilar(
  aphashA: string,
  aphashB: string,
  threshold = 8
): boolean {
  return compareVideoAphash(aphashA, aphashB) <= threshold;
}
