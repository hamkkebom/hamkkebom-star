/**
 * 기존 영상 다운로드 일괄 활성화 스크립트
 *
 * CF Stream에서 다운로드가 활성화되지 않은 영상을 찾아 활성화합니다.
 * 사용법: npx dotenv-cli -e .env -- node scripts/enable-downloads.mjs
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DB_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN || !DB_URL) {
  console.error("환경변수 누락: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, DATABASE_URL 또는 DIRECT_URL 필요");
  process.exit(1);
}

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: DB_URL });
await client.connect();

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream`;

async function checkDownloadStatus(uid) {
  const res = await fetch(`${BASE_URL}/${uid}/downloads`, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.result?.default?.status ?? null;
}

async function enableDownload(uid) {
  const res = await fetch(`${BASE_URL}/${uid}/downloads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`  ❌ 활성화 실패 (${res.status}): ${uid}`);
    return false;
  }
  const json = await res.json();
  const status = json.result?.default?.status;
  console.log(`  ✅ 활성화 요청 완료 (status: ${status}): ${uid}`);
  return true;
}

// streamUid가 있는 모든 영상 조회
const { rows: videos } = await client.query(`
  SELECT id, title, "streamUid", "createdAt"
  FROM videos
  WHERE "streamUid" IS NOT NULL
  ORDER BY "createdAt" ASC
`);

console.log(`\n📹 총 ${videos.length}개 영상 확인 중...\n`);

let alreadyReady = 0;
let inProgress = 0;
let newlyEnabled = 0;
let failed = 0;

for (let i = 0; i < videos.length; i++) {
  const v = videos[i];
  const date = new Date(v.createdAt).toISOString().slice(0, 10);

  // CF API 요청 rate limit 방지 (50ms 간격)
  if (i > 0) await new Promise((r) => setTimeout(r, 50));

  const status = await checkDownloadStatus(v.streamUid);

  if (status === "ready") {
    alreadyReady++;
    continue;
  }

  if (status === "inprogress") {
    console.log(`  ⏳ 준비 중 (이미 활성화됨): ${date} | ${v.title.slice(0, 40)}`);
    inProgress++;
    continue;
  }

  // 미활성화 → 활성화 요청
  console.log(`  🔄 활성화 시작: ${date} | ${v.title.slice(0, 40)}`);
  const ok = await enableDownload(v.streamUid);
  if (ok) {
    newlyEnabled++;
  } else {
    failed++;
  }
}

console.log(`\n📊 결과:`);
console.log(`  ✅ 이미 준비됨: ${alreadyReady}`);
console.log(`  ⏳ 준비 중: ${inProgress}`);
console.log(`  🔄 새로 활성화: ${newlyEnabled}`);
console.log(`  ❌ 실패: ${failed}`);
console.log(`  📹 전체: ${videos.length}`);

await client.end();
console.log("\n완료!");
