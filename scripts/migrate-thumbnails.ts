/**
 * 썸네일 마이그레이션: Airtable → R2
 * 
 * Airtable에서 원본 커스텀 썸네일을 다시 받아와 R2에 영구 저장하고
 * DB Video.thumbnailUrl을 R2 공개 URL로 업데이트합니다.
 *
 * 사용법: npx tsx scripts/migrate-thumbnails.ts [--dry-run]
 */

import Airtable from "airtable";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

// ─── 설정 ───────────────────────────────────────────────
const AIRTABLE_PAT =
    "patF9b1oNmih2XLHy.00c1c79b30101d8b89f32fdbe105c75ba8ce40e11420d980471b971aac4bcf5c";
const AIRTABLE_BASE_ID = "apphD72afHxR1xby6";
const VIDEOS_TABLE_ID = "tbl5H5heGupAwaPGn";

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-r2.hamkkebom.com";

// ─── 유틸 ───────────────────────────────────────────────
function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] ${msg}`);
}

function getS3Client(): S3Client {
    return new S3Client({
        region: "auto",
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
        credentials: {
            accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
    });
}

async function downloadImage(url: string): Promise<Buffer | null> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            log(`    ⚠ 다운로드 실패: HTTP ${resp.status}`);
            return null;
        }
        const arrayBuffer = await resp.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e: any) {
        log(`    ⚠ 다운로드 에러: ${e.message}`);
        return null;
    }
}

async function uploadToR2(
    s3: S3Client,
    key: string,
    body: Buffer,
    contentType: string
): Promise<boolean> {
    try {
        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Key: key,
                Body: body,
                ContentType: contentType,
            })
        );
        return true;
    } catch (e: any) {
        log(`    ⚠ R2 업로드 에러: ${e.message}`);
        return false;
    }
}

// ─── 메인 ───────────────────────────────────────────────
async function main() {
    const dryRun = process.argv.includes("--dry-run");
    if (dryRun) log("🔸 DRY RUN 모드 — 실제 변경 없음");

    // Airtable 연결
    Airtable.configure({ apiKey: AIRTABLE_PAT });
    const base = Airtable.base(AIRTABLE_BASE_ID);

    // Prisma 연결
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL not set");
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter } as any);
    log("✅ DB 연결 완료");

    // R2 클라이언트
    const s3 = getS3Client();
    log("✅ R2 연결 완료");

    // 1. Airtable Videos 전체 조회
    log("\n📋 Airtable Videos 테이블 조회 중...");
    const airtableRecords: any[] = [];
    await new Promise<void>((resolve, reject) => {
        base(VIDEOS_TABLE_ID)
            .select({ pageSize: 100 })
            .eachPage(
                (records: any, next: any) => {
                    airtableRecords.push(...records);
                    log(`  ... ${airtableRecords.length}건 로드됨`);
                    next();
                },
                (err: any) => (err ? reject(err) : resolve())
            );
    });
    log(`✅ 총 ${airtableRecords.length}건 로드 완료`);

    // 2. 썸네일이 있는 레코드 필터
    const withThumbs = airtableRecords.filter((r) => {
        const thumbs = r.fields["썸네일URL"] as any[];
        return thumbs && thumbs.length > 0 && thumbs[0]?.url;
    });
    log(`📸 썸네일이 있는 영상: ${withThumbs.length}건`);

    // 3. DB Video 매핑 (externalId → DB id)
    const allVideos = await prisma.video.findMany({
        where: { externalId: { not: null } },
        select: { id: true, externalId: true, thumbnailUrl: true },
    });
    const videoMap = new Map<string, { id: string; thumbnailUrl: string | null }>();
    for (const v of allVideos) {
        if (v.externalId) videoMap.set(v.externalId, { id: v.id, thumbnailUrl: v.thumbnailUrl });
    }
    log(`📦 DB Video 레코드: ${videoMap.size}건 (externalId 있는 것)`);

    // 4. 마이그레이션 실행
    let success = 0;
    let skipped = 0;
    let failed = 0;
    let alreadyR2 = 0;

    for (let i = 0; i < withThumbs.length; i++) {
        const rec = withThumbs[i];
        const externalId = rec.fields["영상ID"] as string;
        const thumbs = rec.fields["썸네일URL"] as any[];
        const freshUrl = thumbs[0]?.url;
        const filename = thumbs[0]?.filename || "thumbnail.jpg";
        const contentType = thumbs[0]?.type || "image/jpeg";

        const dbVideo = externalId ? videoMap.get(externalId) : null;

        if (!dbVideo) {
            log(`  [${i + 1}/${withThumbs.length}] ⏭ ${externalId}: DB에 없음`);
            skipped++;
            continue;
        }

        // 이미 R2 URL이면 건너뜀
        if (dbVideo.thumbnailUrl?.includes("pub-r2.hamkkebom.com")) {
            alreadyR2++;
            continue;
        }

        if (dryRun) {
            log(`  [${i + 1}/${withThumbs.length}] [DRY] ${externalId} → R2 업로드 예정`);
            success++;
            continue;
        }

        // 확장자 추출
        const ext = filename.split(".").pop() || "jpg";
        const r2Key = `thumbnails/${dbVideo.id}.${ext}`;

        // 다운로드
        log(`  [${i + 1}/${withThumbs.length}] ${externalId}: 다운로드 중...`);
        const imageBuffer = await downloadImage(freshUrl);
        if (!imageBuffer) {
            failed++;
            continue;
        }

        // R2 업로드
        const uploaded = await uploadToR2(s3, r2Key, imageBuffer, contentType);
        if (!uploaded) {
            failed++;
            continue;
        }

        // DB 업데이트
        const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;
        await prisma.video.update({
            where: { id: dbVideo.id },
            data: { thumbnailUrl: publicUrl },
        });

        success++;
        if (success % 20 === 0) {
            log(`  ✅ ${success}건 완료...`);
        }
    }

    // 5. 결과
    log("\n═══════ 마이그레이션 결과 ═══════");
    log(`✅ 성공: ${success}건`);
    log(`⏭ 이미 R2: ${alreadyR2}건`);
    log(`⏭ 건너뜀: ${skipped}건`);
    log(`❌ 실패: ${failed}건`);

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("❌ 마이그레이션 에러:", e);
    process.exit(1);
});
