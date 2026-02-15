import { PrismaClient } from './src/generated/prisma/client/index.js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { PrismaPg } = await import('@prisma/adapter-pg');
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const subs = await prisma.submission.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
        id: true,
        version: true,
        versionTitle: true,
        video: { select: { title: true } },
        assignment: { select: { request: { select: { title: true } } } },
    }
});

for (const s of subs) {
    console.log(JSON.stringify({
        id: s.id.substring(0, 8),
        ver: s.version,
        vTitle: s.versionTitle,
        vidTitle: s.video?.title,
        reqTitle: s.assignment?.request?.title
    }));
}

await prisma.$disconnect();
process.exit(0);
