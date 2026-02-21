/**
 * 백필 스크립트: Submission.status가 APPROVED인데
 * 연결된 Video.status가 아직 APPROVED가 아닌 영상들을 일괄 업데이트합니다.
 *
 * 실행: node scripts/backfill-video-status.mjs
 */

import { PrismaClient } from "../src/generated/prisma/client/index.js";

const prisma = new PrismaClient();

async function main() {
    const submissions = await prisma.submission.findMany({
        where: {
            status: "APPROVED",
            videoId: { not: null },
            video: {
                status: { not: "APPROVED" }
            }
        },
        select: {
            id: true,
            videoId: true,
            video: { select: { id: true, title: true, status: true } }
        }
    });

    console.log(`\n🔍 승인된 Submission 중 Video.status가 APPROVED가 아닌 건: ${submissions.length}개\n`);

    if (submissions.length === 0) {
        console.log("✅ 업데이트할 영상이 없습니다.");
        return;
    }

    for (const sub of submissions) {
        if (!sub.videoId || !sub.video) continue;
        console.log(`  📹 [${sub.video.title}] Video.status: ${sub.video.status} → APPROVED`);
        await prisma.video.update({
            where: { id: sub.videoId },
            data: { status: "APPROVED" }
        });
    }

    console.log(`\n✅ ${submissions.length}개 영상의 status를 APPROVED로 변경 완료!`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
