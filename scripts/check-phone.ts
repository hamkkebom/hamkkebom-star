import { PrismaClient } from "../src/generated/prisma/client";
const p = new PrismaClient();
async function main() {
    const users = await p.user.findMany({
        select: { id: true, name: true, phone: true },
    });
    console.log(JSON.stringify(users, null, 2));
    await p.$disconnect();
}
main();
