import { PrismaClient } from './src/generated/prisma/client';

// Hardcoding connection string
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres.vxyzqymlnqxlcbqbrvip:Hamkkebom2026Star@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
        }
    }
});

async function main() {
    try {
        console.log('Connecting to database...');
        const count = await prisma.submission.count({
            where: { thumbnailUrl: { not: null } }
        });
        console.log(`\n=== Thumbnail Verification ===`);
        console.log(`Total submissions with thumbnails: ${count}`);

        if (count > 0) {
            const samples = await prisma.submission.findMany({
                where: { thumbnailUrl: { not: null } },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    thumbnailUrl: true,
                    versionTitle: true,
                    createdAt: true
                }
            });
            console.log('\nRecent 5 submissions with thumbnails:');
            samples.forEach(s => {
                console.log(`- [${s.createdAt.toISOString()}] ${s.versionTitle || 'No Title'}`);
                console.log(`  URL: ${s.thumbnailUrl}`);
            });
        } else {
            console.log('\nNo submissions found with thumbnails.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
