
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const submissions = await prisma.submission.findMany({
        where: { thumbnailUrl: { not: null } },
        take: 5,
        select: { id: true, thumbnailUrl: true, streamUid: true }
    });
    console.log('Submissions with thumbnails:', submissions);

    const videos = await prisma.video.findMany({
        where: { thumbnailUrl: { not: null } },
        take: 5,
        select: { id: true, thumbnailUrl: true, streamUid: true }
    });
    console.log('Videos with thumbnails:', videos);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
