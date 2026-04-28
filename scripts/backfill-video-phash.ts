/**
 * 백필 스크립트: streamUid가 있고 thumbnailPhash가 없는 모든 Video에 대해
 * perceptual hash를 계산하여 저장합니다.
 *
 * 실행: npx tsx scripts/backfill-video-phash.ts
 *
 * 환경변수 필요:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   DATABASE_URL
 */

import "dotenv/config";
import { computeVideoPhash } from "../src/lib/video-phash";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../src/generated/prisma/client");
const prisma = new PrismaClient();

const CONCURRENCY = 3;
const DELAY_MS = 200; // CF Stream API 부하 분산용

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function processOne(video: {
  id: string;
  title: string;
  streamUid: string | null;
  technicalSpec: { duration: number | null } | null;
}) {
  if (!video.streamUid) return;
  const duration = video.technicalSpec?.duration ?? null;
  const hash = await computeVideoPhash(video.streamUid, duration);
  if (!hash) {
    console.log(`  ⚠️ [${video.title}] hash 계산 실패`);
    return;
  }
  await prisma.video.update({
    where: { id: video.id },
    data: { thumbnailPhash: hash },
  });
  console.log(`  ✅ [${video.title}] ${hash.slice(0, 32)}...`);
}

async function main() {
  const videos = await prisma.video.findMany({
    where: {
      streamUid: { not: null },
      thumbnailPhash: null,
    },
    select: {
      id: true,
      title: true,
      streamUid: true,
      technicalSpec: { select: { duration: true } },
    },
  });

  console.log(`\n🔍 hash 미계산 영상: ${videos.length}개\n`);
  if (videos.length === 0) {
    console.log("✅ 백필할 영상이 없습니다.");
    return;
  }

  // 동시성 제한: CONCURRENCY개씩 배치 처리
  for (let i = 0; i < videos.length; i += CONCURRENCY) {
    const batch = videos.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processOne));
    if (i + CONCURRENCY < videos.length) await delay(DELAY_MS);
    console.log(`  ── 진행: ${Math.min(i + CONCURRENCY, videos.length)}/${videos.length}`);
  }

  console.log(`\n✅ 백필 완료!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
