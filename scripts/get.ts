import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true } });
    const star = await prisma.user.findFirst({ where: { role: 'STAR' }, select: { email: true } });
    console.log("Admin email:", admin?.email);
    console.log("Star email:", star?.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
