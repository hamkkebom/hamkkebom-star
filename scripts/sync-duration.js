/**
 * 기존 영상 duration 일괄 동기화 스크립트
 * DB에서 streamUid가 있고 duration이 NULL인 영상을 찾아
 * Cloudflare Stream에서 duration을 가져와 저장합니다.
 */

const DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const { PrismaClient } = require("./src/generated/prisma/client");

const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } },
});

async function getVideoInfo(uid) {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${uid}`,
        { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
}

async function main() {
    // duration이 없는 영상 조회
    const videos = await prisma.video.findMany({
        where: {
            streamUid: { not: null },
            OR: [
                { technicalSpec: null },
                { technicalSpec: { duration: null } },
            ],
        },
        select: { id: true, streamUid: true, title: true },
    });

    console.log(`동기화 대상: ${videos.length}개 영상`);

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (!video.streamUid) continue;

        try {
            const info = await getVideoInfo(video.streamUid);

            if (!info) {
                skipped++;
                continue;
            }

            if (info.status?.state !== "ready") {
                skipped++;
                continue;
            }

            if (!info.duration) {
                skipped++;
                continue;
            }

            await prisma.videoTechnicalSpec.upsert({
                where: { videoId: video.id },
                update: {
                    duration: info.duration,
                    width: info.input?.width || null,
                    height: info.input?.height || null,
                },
                create: {
                    videoId: video.id,
                    duration: info.duration,
                    width: info.input?.width || null,
                    height: info.input?.height || null,
                },
            });

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

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error("스크립트 오류:", err);
    prisma.$disconnect();
    process.exit(1);
});
