/**
 * Stream/R2 클린 슬레이트 + 에어테이블 영상 → Cloudflare Stream 업로드
 *
 * 1단계: 기존 Stream 영상 전체 삭제
 * 2단계: 기존 R2 버킷 전체 삭제
 * 3단계: 에어테이블 Videos 테이블에서 영상 URL 가져오기
 * 4단계: 각 영상을 Cloudflare Stream에 URL 기반 업로드
 * 5단계: DB의 Video.streamUid 업데이트
 *
 * 사용법: npx tsx scripts/stream-upload.ts
 */

import Airtable from "airtable";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

// ─── 설정 ───────────────────────────────────────────────
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;

const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_BUCKET = process.env.R2_BUCKET || "video-assets-bucket";

const AIRTABLE_PAT =
  "patF9b1oNmih2XLHy.00c1c79b30101d8b89f32fdbe105c75ba8ce40e11420d980471b971aac4bcf5c";
const AIRTABLE_BASE_ID = "apphD72afHxR1xby6";
const TABLE_VIDEOS = "tbl5H5heGupAwaPGn";
const TABLE_SUBMISSIONS = "tbl4vQM9wT0qhikDL";

// ─── 유틸 ─────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString("ko-KR")}] ${msg}`);
}

async function cfFetch(path: string, options: RequestInit = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // DELETE returns 204 No Content
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return { success: true };
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: res.ok, raw: text };
  }
}

// ─── Prisma 초기화 ────────────────────────────────────
async function getPrisma() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ═══════════════════════════════════════════════════════
// 1단계: 기존 Stream 영상 전체 삭제
// ═══════════════════════════════════════════════════════
async function deleteAllStreamVideos() {
  log("🗑️  1단계: Stream 영상 전체 삭제 시작...");

  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await cfFetch("/stream?per_page=100");

    if (!res.success || !res.result || res.result.length === 0) {
      hasMore = false;
      break;
    }

    for (const video of res.result) {
      try {
        await cfFetch(`/stream/${video.uid}`, { method: "DELETE" });
        deleted++;
        log(`  ✅ 삭제 ${deleted}: ${video.uid} (${video.meta?.name || "이름 없음"})`);
      } catch (err: any) {
        log(`  ⚠️ 삭제 실패: ${video.uid} - ${err.message}`);
      }
    }

    // API 속도 제한 방지
    await new Promise((r) => setTimeout(r, 500));
  }

  log(`🗑️  Stream 삭제 완료: ${deleted}건`);
  return deleted;
}

// ═══════════════════════════════════════════════════════
// 2단계: R2 버킷 전체 삭제
// ═══════════════════════════════════════════════════════
async function deleteAllR2Objects() {
  log("🗑️  2단계: R2 객체 전체 삭제 시작...");

  try {
    // S3-compatible API로 R2 버킷 객체 목록 조회
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");

    const s3 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });

    let deleted = 0;
    let continuationToken: string | undefined;

    do {
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );

      if (!listRes.Contents || listRes.Contents.length === 0) break;

      const keys = listRes.Contents.map((obj) => ({ Key: obj.Key! }));

      await s3.send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: keys },
        })
      );

      deleted += keys.length;
      log(`  ✅ R2 삭제: ${deleted}건`);
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    log(`🗑️  R2 삭제 완료: ${deleted}건`);
    return deleted;
  } catch (err: any) {
    log(`  ⚠️ R2 삭제 실패 (키 미설정?): ${err.message}`);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════
// 3단계: 에어테이블 → Stream 업로드
// ═══════════════════════════════════════════════════════
type VideoRecord = {
  airtableId: string;
  externalId: string;
  title: string;
  fileUrl: string | null;
  thumbnailUrl: string | null;
};

async function fetchAirtableVideos(): Promise<VideoRecord[]> {
  log("📥 3단계: 에어테이블 영상 데이터 가져오기...");

  Airtable.configure({ apiKey: AIRTABLE_PAT });
  const base = Airtable.base(AIRTABLE_BASE_ID);

  const videos: VideoRecord[] = [];

  // Videos 테이블에서 영상 정보 가져오기
  const videoRecords: Airtable.Record<any>[] = [];
  await new Promise<void>((resolve, reject) => {
    base(TABLE_VIDEOS)
      .select({ pageSize: 100 })
      .eachPage(
        (records: any[], next: () => void) => {
          videoRecords.push(...records);
          next();
        },
        (err: any) => (err ? reject(err) : resolve())
      );
  });

  log(`  📋 Videos 테이블: ${videoRecords.length}건`);

  for (const rec of videoRecords) {
    const f = rec.fields;
    const externalId = (f["영상ID"] as string) || rec.id;
    const title = (f["최종제목"] as string) || "제목 없음";

    // 영상 파일: "완성영상" 첨부파일 필드
    const attachments = f["완성영상"] as any[];
    const fileUrl = attachments && attachments.length > 0 ? attachments[0]?.url : null;

    const thumbnails = f["썸네일URL"] as any[];
    const thumbnailUrl = thumbnails && thumbnails.length > 0 ? thumbnails[0]?.url : null;

    videos.push({
      airtableId: rec.id,
      externalId,
      title,
      fileUrl,
      thumbnailUrl,
    });
  }

  const hasVideoUrl = videos.filter((v) => v.fileUrl);
  log(`  🎬 영상 파일 있는 것: ${hasVideoUrl.length}/${videos.length}건`);

  return videos;
}

async function uploadToStream(
  title: string,
  url: string
): Promise<string | null> {
  try {
    const res = await cfFetch("/stream/copy", {
      method: "POST",
      body: JSON.stringify({
        url,
        meta: { name: title },
        requireSignedURLs: false,
      }),
    });

    if (res.success && res.result?.uid) {
      return res.result.uid;
    }

    log(`  ⚠️ 업로드 응답 이상: ${JSON.stringify(res.errors || res.messages)}`);
    return null;
  } catch (err: any) {
    log(`  ❌ 업로드 실패: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
// 메인

async function main() {
  log("=".repeat(60));
  log("Stream/R2 클린 슬레이트 + 에어테이블 영상 업로드");
  log("=".repeat(60));

  // 1단계: Stream 삭제
  const streamDeleted = await deleteAllStreamVideos();

  // 2단계: R2 삭제
  const r2Deleted = await deleteAllR2Objects();

  // 3단계: 에어테이블 영상 가져오기
  const videos = await fetchAirtableVideos();

  // 먼저 어떤 영상에 URL이 있는지 확인
  const withUrl = videos.filter((v) => v.fileUrl);

  if (withUrl.length === 0) {
    log("\n⚠️ 에어테이블 Videos 테이블에 영상 파일 URL이 없습니다.");
    log("에어테이블 필드명을 확인해주세요. 아래는 첫 Video의 필드 목록:");

    // 첫 레코드 필드 확인을 위해 직접 Airtable API 호출
    Airtable.configure({ apiKey: AIRTABLE_PAT });
    const base = Airtable.base(AIRTABLE_BASE_ID);
    const firstRecord = await new Promise<any>((resolve, reject) => {
      base(TABLE_VIDEOS)
        .select({ maxRecords: 1 })
        .firstPage((err: any, records: any[]) => {
          if (err) reject(err);
          else resolve(records?.[0]);
        });
    });

    if (firstRecord) {
      log("\n📋 에어테이블 Videos 테이블 필드 목록:");
      for (const [key, value] of Object.entries(firstRecord.fields)) {
        const type = Array.isArray(value) ? `Array[${(value as any[]).length}]` : typeof value;
        const preview = typeof value === "string" ? value.substring(0, 80) : JSON.stringify(value)?.substring(0, 80);
        log(`  • ${key} (${type}): ${preview}`);
      }
    }

    log("\n💡 영상 파일 필드를 찾으면 스크립트를 수정해서 다시 실행하세요.");
    return;
  }

  log(`\n📤 4단계: ${withUrl.length}건 영상 → Stream 업로드 시작...`);

  // Prisma 초기화
  const prisma = await getPrisma();

  let uploaded = 0;
  let failed = 0;

  for (const video of withUrl) {
    log(`\n  📤 [${uploaded + failed + 1}/${withUrl.length}] ${video.title}`);
    log(`     URL: ${video.fileUrl!.substring(0, 100)}...`);

    const streamUid = await uploadToStream(video.title, video.fileUrl!);

    if (streamUid) {
      uploaded++;
      log(`     ✅ streamUid: ${streamUid}`);

      // DB 업데이트
      try {
        await prisma.video.updateMany({
          where: { externalId: video.externalId },
          data: { streamUid },
        });
        log(`     💾 DB 업데이트 완료`);
      } catch (err: any) {
        log(`     ⚠️ DB 업데이트 실패: ${err.message}`);
      }
    } else {
      failed++;
    }

    // API 속도 제한 방지 (Stream API는 10 req/sec)
    await new Promise((r) => setTimeout(r, 1000));
  }

  log("\n" + "=".repeat(60));
  log("📊 최종 결과");
  log("=".repeat(60));
  log(`  Stream 삭제: ${streamDeleted}건`);
  log(`  R2 삭제: ${r2Deleted}건`);
  log(`  에어테이블 영상 총: ${videos.length}건`);
  log(`  영상 URL 있는 것: ${withUrl.length}건`);
  log(`  업로드 성공: ${uploaded}건`);
  log(`  업로드 실패: ${failed}건`);
}

main().catch(console.error);
