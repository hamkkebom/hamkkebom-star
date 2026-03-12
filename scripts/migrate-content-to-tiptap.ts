/**
 * 기존 게시글의 plain text content를 Tiptap JSON으로 마이그레이션.
 * 실행: npx tsx scripts/migrate-content-to-tiptap.ts
 */
import { PrismaClient, Prisma } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

function textToTiptapJson(text: string): object {
  // Split by double newlines for paragraphs, single newlines become hard breaks
  const paragraphs = text.split(/\n\n+/);
  const content = paragraphs.map((para) => {
    const lines = para.split(/\n/);
    const children: object[] = [];
    lines.forEach((line, i) => {
      if (line.trim()) {
        children.push({ type: "text", text: line });
      }
      if (i < lines.length - 1) {
        children.push({ type: "hardBreak" });
      }
    });
    return {
      type: "paragraph",
      content: children.length > 0 ? children : [{ type: "text", text: " " }],
    };
  });

  return {
    type: "doc",
    content:
      content.length > 0
        ? content
        : [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
  };
}

async function main() {
  console.log("🔄 Starting content migration to Tiptap JSON...");

  const posts = await prisma.boardPost.findMany({
    where: {
      contentJson: { equals: Prisma.JsonNull },
      content: { not: "" },
    },
    select: { id: true, content: true },
  });

  console.log(`📋 Found ${posts.length} posts to migrate.`);

  let migrated = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const json = textToTiptapJson(post.content);
      await prisma.boardPost.update({
        where: { id: post.id },
        data: { contentJson: json },
      });
      migrated++;
      if (migrated % 50 === 0) {
        console.log(`  ✅ Migrated ${migrated}/${posts.length}...`);
      }
    } catch (error) {
      failed++;
      console.error(`  ❌ Failed to migrate post ${post.id}:`, error);
    }
  }

  console.log(
    `\n🏁 Migration complete: ${migrated} migrated, ${failed} failed out of ${posts.length} total.`
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
