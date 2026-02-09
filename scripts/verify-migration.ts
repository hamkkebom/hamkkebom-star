import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function verify() {
  const counts = {
    Users: await prisma.user.count(),
    Counselors: await prisma.counselor.count(),
    Videos: await prisma.video.count(),
    Submissions: await prisma.submission.count(),
    Feedbacks: await prisma.feedback.count(),
    MediaPlacements: await prisma.mediaPlacement.count(),
    Categories: await prisma.category.count(),
  };

  console.log("\n═══════ DB 검증 결과 ═══════");
  let total = 0;
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count}`);
    total += count;
  }
  console.log(`  ─────────────`);
  console.log(`  총합: ${total}`);

  // 샘플 데이터 확인
  const sampleUser = await prisma.user.findFirst({
    where: { externalId: { not: null } },
    select: { id: true, name: true, email: true, externalId: true, role: true },
  });
  console.log("\n  샘플 User:", JSON.stringify(sampleUser));

  const sampleVideo = await prisma.video.findFirst({
    where: { externalId: { not: null } },
    select: { id: true, title: true, externalId: true, status: true },
  });
  console.log("  샘플 Video:", JSON.stringify(sampleVideo));

  const sampleCounselor = await prisma.counselor.findFirst({
    select: { id: true, displayName: true, externalId: true, status: true },
  });
  console.log("  샘플 Counselor:", JSON.stringify(sampleCounselor));

  await prisma.$disconnect();
}

verify().catch(console.error);
