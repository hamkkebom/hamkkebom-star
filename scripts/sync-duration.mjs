/**
 * 기존 영상 duration 일괄 동기화 스크립트
 * 
 * 사용법: npx dotenv-cli -- node scripts/sync-duration.mjs
 * 또는:  node -e "require('dotenv').config()" && node scripts/sync-duration.mjs
 */

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DB_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

// pg 직접 사용
import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: DB_URL });
await client.connect();

async function getVideoInfo(uid) {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
        { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
}

// streamUid가 있고 duration이 없는 영상 조회
const { rows: videos } = await client.query(`
  SELECT v.id, v."streamUid", v.title
  FROM videos v
  LEFT JOIN video_technical_specs vts ON vts."videoId" = v.id
  WHERE v."streamUid" IS NOT NULL
    AND (vts.id IS NULL OR vts.duration IS NULL)
`);

console.log(`동기화 대상: ${videos.length}개 영상`);

let synced = 0;
let failed = 0;
let skipped = 0;

for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    try {
        const info = await getVideoInfo(video.streamUid);

        if (!info || info.status?.state !== "ready" || !info.duration) {
            skipped++;
            continue;
        }

        // upsert: 있으면 update, 없으면 insert
        await client.query(`
      INSERT INTO video_technical_specs (id, "videoId", duration, width, height, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT ("videoId")
      DO UPDATE SET duration = $2, width = $3, height = $4, "updatedAt" = NOW()
    `, [video.id, info.duration, info.input?.width || null, info.input?.height || null]);

        synced++;
        if ((i + 1) % 20 === 0) {
            console.log(`  진행: ${i + 1}/${videos.length} (성공: ${synced}, 실패: ${failed}, 건너뜀: ${skipped})`);
        }
    } catch (err) {
        failed++;
        console.error(`  실패: ${video.id} - ${err.message}`);
    }
}

console.log(`\n=== 완료 ===`);
console.log(`전체: ${videos.length}`);
console.log(`성공: ${synced}`);
console.log(`실패: ${failed}`);
console.log(`건너뜀: ${skipped}`);

await client.end();
