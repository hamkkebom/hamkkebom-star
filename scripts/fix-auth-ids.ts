/**
 * 기존 마이그레이션 유저의 authId를 실제 Supabase Auth로 업데이트
 * 사용법: npx tsx scripts/fix-auth-ids.ts [--dry-run]
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_EMAIL = "hamkkebom12@gmail.com";
const ADMIN_PASSWORD = "3144mentor!";

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) log("🔸 DRY RUN 모드");

  // Prisma
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter } as any);
  log("✅ Prisma 연결");

  // Supabase
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  log("✅ Supabase Admin 연결");

  // 모든 유저 조회
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, authId: true, role: true, externalId: true },
  });
  log(`총 ${users.length}명 유저`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // 이미 Supabase Auth에 존재하는지 확인
      const { data: existingUsers } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      // 이메일로 직접 검색
      const email = user.email;
      const password = user.email === ADMIN_EMAIL ? ADMIN_PASSWORD : "Temp1234!";

      if (dryRun) {
        log(`  [DRY] ${user.externalId || user.email} (${user.role})`);
        skipped++;
        continue;
      }

      // Supabase Auth 생성 시도
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
            externalId: user.externalId,
          },
        });

      if (authError) {
        if (authError.message.includes("already been registered")) {
          // 이미 Auth 있으면 조회해서 authId 업데이트
          const { data: listData } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const found = listData?.users?.find((u: any) => u.email === email);
          if (found) {
            await prisma.user.update({
              where: { id: user.id },
              data: { authId: found.id },
            });
            log(`  ✅ ${user.externalId || email} → Auth 기존: ${found.id.slice(0, 8)}...`);
            created++;
          } else {
            log(`  ⚠️ ${email}: Auth 존재하지만 조회 실패`);
            skipped++;
          }
          continue;
        }
        throw new Error(authError.message);
      }

      // Auth 생성 성공 → authId 업데이트
      const authId = authData.user!.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { authId },
      });
      log(`  ✅ ${user.externalId || email} → Auth 생성: ${authId.slice(0, 8)}...`);
      created++;
    } catch (err: any) {
      log(`  ❌ ${user.externalId || user.email}: ${err.message}`);
      errors++;
    }
  }

  log("\n═══════ Auth 업데이트 완료 ═══════");
  log(`생성/업데이트: ${created}`);
  log(`건너뜀: ${skipped}`);
  log(`에러: ${errors}`);

  await prisma.$disconnect();
}

main().catch(console.error);
