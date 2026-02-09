/**
 * 에어테이블 → Supabase 마이그레이션 스크립트
 * 6개 테이블: Users → Counselors → Videos → submissions → feedbacks → MediaPlacements
 *
 * 사용법: npx tsx scripts/migrate-airtable.ts [--dry-run] [--table=Users]
 */

import Airtable from "airtable";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";
import { randomUUID } from "crypto";

// .env.local 로드
config({ path: ".env.local" });

// ─── 설정 ───────────────────────────────────────────────
const AIRTABLE_PAT =
  "patF9b1oNmih2XLHy.00c1c79b30101d8b89f32fdbe105c75ba8ce40e11420d980471b971aac4bcf5c";
const AIRTABLE_BASE_ID = "apphD72afHxR1xby6";

const TABLE_IDS = {
  Users: "tblZzDcS0MQ5zAQir",
  Counselors: "tblyMDkbqpclfehXt",
  Videos: "tbl5H5heGupAwaPGn",
  submissions: "tbl4vQM9wT0qhikDL",
  feedbacks: "tblVW8D7PFglyzFwn",
  MediaPlacements: "tblMafW5D71lUL3dd",
} as const;

// Supabase Admin (유저 생성용)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_EMAIL = "hamkkebom12@gmail.com";
const ADMIN_PASSWORD = "3144mentor!";

const PROGRESS_FILE = path.join(__dirname, "migration-progress.json");

// ─── 타입 ───────────────────────────────────────────────
interface Progress {
  completedTables: string[];
  recordMaps: {
    // Airtable recID → Prisma cuid
    users: Record<string, string>;
    counselors: Record<string, string>;
    videos: Record<string, string>;
    submissions: Record<string, string>;
    feedbacks: Record<string, string>;
    mediaPlacements: Record<string, string>;
  };
  errors: Array<{ table: string; recordId: string; error: string }>;
}

// ─── 유틸 ───────────────────────────────────────────────
function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  }
  return {
    completedTables: [],
    recordMaps: {
      users: {},
      counselors: {},
      videos: {},
      submissions: {},
      feedbacks: {},
      mediaPlacements: {},
    },
    errors: [],
  };
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function fetchAllRecords(
  base: Airtable.Base,
  tableId: string
): Promise<Airtable.Records<Airtable.FieldSet>> {
  const all: Airtable.Records<Airtable.FieldSet> = [];
  await new Promise<void>((resolve, reject) => {
    base(tableId)
      .select({ pageSize: 100 })
      .eachPage(
        (records, next) => {
          all.push(...records);
          log(`  ... ${all.length} records fetched`);
          next();
        },
        (err) => (err ? reject(err) : resolve())
      );
  });
  return all;
}

// ─── 메인 ───────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const tableFilter = args
    .find((a) => a.startsWith("--table="))
    ?.split("=")[1];

  if (dryRun) log("🔸 DRY RUN 모드 — 실제 DB 변경 없음");

  // Airtable 연결
  Airtable.configure({ apiKey: AIRTABLE_PAT });
  const base = Airtable.base(AIRTABLE_BASE_ID);

  // Prisma 연결 (Prisma 7 + PrismaPg adapter)
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set in .env.local");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter } as any);
  log("✅ Prisma 연결 완료");

  // Supabase Admin 연결 (service key 있을 때만)
  let supabase: any = null;
  if (!dryRun && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const mod = await import("@supabase/supabase-js");
      supabase = mod.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      log("✅ Supabase Admin 연결 완료");
    } catch (e: any) {
      log(`⚠️ Supabase 연결 실패: ${e.message} — Auth 없이 진행`);
    }
  } else if (!dryRun) {
    log("⚠️ SUPABASE_SERVICE_ROLE_KEY 없음 — Auth 없이 Prisma만으로 진행");
  } else {
    log("⏭ Supabase 연결 건너뜀 (dry-run)");
  }

  const progress = loadProgress();

  try {
    // ─── 1. Users (43건) ─────────────────────────────────
    if (
      !tableFilter ||
      tableFilter === "Users" ||
      !progress.completedTables.includes("Users")
    ) {
      await migrateUsers(base, prisma, supabase, progress, dryRun);
    }

    // ─── 2. Counselors (302건) ───────────────────────────
    if (
      !tableFilter ||
      tableFilter === "Counselors" ||
      !progress.completedTables.includes("Counselors")
    ) {
      await migrateCounselors(base, prisma, progress, dryRun);
    }

    // ─── 3. Videos (443건) ───────────────────────────────
    if (
      !tableFilter ||
      tableFilter === "Videos" ||
      !progress.completedTables.includes("Videos")
    ) {
      await migrateVideos(base, prisma, progress, dryRun);
    }

    // ─── 4. Submissions (443건) ──────────────────────────
    if (
      !tableFilter ||
      tableFilter === "submissions" ||
      !progress.completedTables.includes("submissions")
    ) {
      await migrateSubmissions(base, prisma, progress, dryRun);
    }

    // ─── 5. Feedbacks (74건) ─────────────────────────────
    if (
      !tableFilter ||
      tableFilter === "feedbacks" ||
      !progress.completedTables.includes("feedbacks")
    ) {
      await migrateFeedbacks(base, prisma, progress, dryRun);
    }

    // ─── 6. MediaPlacements (24건) ───────────────────────
    if (
      !tableFilter ||
      tableFilter === "MediaPlacements" ||
      !progress.completedTables.includes("MediaPlacements")
    ) {
      await migrateMediaPlacements(base, prisma, progress, dryRun);
    }

    // ─── 결과 ────────────────────────────────────────────
    log("\n═══════ 마이그레이션 완료 ═══════");
    log(`Users: ${Object.keys(progress.recordMaps.users).length}`);
    log(`Counselors: ${Object.keys(progress.recordMaps.counselors).length}`);
    log(`Videos: ${Object.keys(progress.recordMaps.videos).length}`);
    log(`Submissions: ${Object.keys(progress.recordMaps.submissions).length}`);
    log(`Feedbacks: ${Object.keys(progress.recordMaps.feedbacks).length}`);
    log(
      `MediaPlacements: ${Object.keys(progress.recordMaps.mediaPlacements).length}`
    );
    log(`Errors: ${progress.errors.length}`);

    if (progress.errors.length > 0) {
      log("\n⚠️ 에러 목록:");
      for (const e of progress.errors) {
        log(`  [${e.table}] ${e.recordId}: ${e.error}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    saveProgress(progress);
  }
}

// ─── Users 마이그레이션 ──────────────────────────────────
async function migrateUsers(
  base: Airtable.Base,
  prisma: PrismaClient,
  supabase: any,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [1/6] Users 마이그레이션 시작 (43건)");
  const records = await fetchAllRecords(base, TABLE_IDS.Users);
  log(`  총 ${records.length}건 로드됨`);

  // 먼저 ADMIN 계정 확인/생성
  let adminUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!adminUser) {
    log("  ADMIN 계정 생성 중...");
    if (!dryRun) {
      let authId: string;
      if (supabase) {
        // Supabase Auth에 ADMIN 생성
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });

        if (authError && !authError.message.includes("already")) {
          throw new Error(`ADMIN Auth 생성 실패: ${authError.message}`);
        }

        authId =
          authData?.user?.id ||
          (
            await supabase.auth.admin.listUsers()
          ).data.users.find((u: any) => u.email === ADMIN_EMAIL)?.id;

        if (!authId) throw new Error("ADMIN authId를 찾을 수 없음");
      } else {
        authId = randomUUID();
      }

      adminUser = await prisma.user.create({
        data: {
          authId,
          email: ADMIN_EMAIL,
          name: "관리자",
          role: "ADMIN",
          externalId: "PE-ADMIN",
        },
      });
      log(`  ✅ ADMIN 생성 완료: ${adminUser.id}`);
    }
  } else {
    log(`  ✅ ADMIN 이미 존재: ${adminUser.id}`);
  }

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["사람ID"] as string;
    const name = (f["이름 copy"] as string) || externalId;
    const role = ((f["역할"] as string) || "STAR").toUpperCase();

    if (progress.recordMaps.users[rec.id]) {
      log(`  ⏭ ${externalId} 이미 처리됨`);
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId} / ${name} / ${role}`);
        progress.recordMaps.users[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 이메일 생성: externalId 기반
      const email = `${externalId.toLowerCase()}@hamkkebom.star`;
      const password = "Temp1234!";

      // 기존 유저 확인
      let existing = await prisma.user.findUnique({
        where: { externalId },
      });

      if (existing) {
        progress.recordMaps.users[rec.id] = existing.id;
        log(`  ✅ ${externalId} 이미 존재: ${existing.id}`);
        continue;
      }

      // Supabase Auth 생성 (supabase 있을 때만)
      let authId: string;
      if (supabase) {
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (authError) {
          throw new Error(`Auth 생성 실패: ${authError.message}`);
        }
        authId = authData.user!.id;
      } else {
        // Auth 없이 UUID 생성
        authId = randomUUID();
      }

      const user = await prisma.user.create({
        data: {
          authId,
          email,
          name,
          role: role === "ADMIN" ? "ADMIN" : "STAR",
          externalId,
          chineseName: (f["한문이름"] as string) || null,
        },
      });

      progress.recordMaps.users[rec.id] = user.id;
      log(`  ✅ ${externalId} → ${user.id}`);
    } catch (err: any) {
      progress.errors.push({
        table: "Users",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  // ADMIN Record ID도 매핑 (feedbacks에서 검수자로 참조될 수 있음)
  if (adminUser) {
    // ADMIN에 해당하는 Airtable 레코드 찾기
    const adminRec = records.find(
      (r) => (r.fields["역할"] as string)?.toUpperCase() === "ADMIN"
    );
    if (adminRec && adminUser) {
      progress.recordMaps.users[adminRec.id] = adminUser.id;
    }
  }

  if (!progress.completedTables.includes("Users")) {
    progress.completedTables.push("Users");
  }
  saveProgress(progress);
  log(`  📋 Users 완료: ${Object.keys(progress.recordMaps.users).length}건`);
}

// ─── Counselors 마이그레이션 ─────────────────────────────
async function migrateCounselors(
  base: Airtable.Base,
  prisma: PrismaClient,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [2/6] Counselors 마이그레이션 시작 (302건)");
  const records = await fetchAllRecords(base, TABLE_IDS.Counselors);
  log(`  총 ${records.length}건 로드됨`);

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["상담사코드"] as string;
    const displayName = (f["호명"] as string) || externalId || "이름없음";

    if (progress.recordMaps.counselors[rec.id]) {
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId} / ${displayName}`);
        progress.recordMaps.counselors[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 상태 매핑
      const statusRaw = (f["상태"] as string) || "";
      let status: "ACTIVE" | "INACTIVE" | "ON_HOLD" = "ACTIVE";
      if (statusRaw.includes("비활성")) status = "INACTIVE";
      else if (statusRaw.includes("보류")) status = "ON_HOLD";

      const counselor = await prisma.counselor.create({
        data: {
          externalId: externalId || null,
          counselorNo: f["상담사ID"] ? Number(f["상담사ID"]) : null,
          displayName,
          status,
          category: (f["분류"] as string) || null,
          imageUrl: (f["이미지URL"] as string) || null,
          landingPageUrl: (f["도착페이지URL"] as string) || null,
          hashtags: (f["해시태그"] as string) || null,
          specialties: (f["주요상담분야"] as string) || null,
          introduction: (f["소개글"] as string) || null,
          announcements: (f["공지사항"] as string) || null,
          career: (f["경력사항"] as string) || null,
          kokkok: !!f["콕콕상담"],
          donation: !!f["기부상담"],
          gift: !!f["선물상담"],
          previousRate: f["이전이용료"]
            ? Number(f["이전이용료"])
            : null,
          targetRate: f["목표이용료"] ? Number(f["목표이용료"]) : null,
          currentHours: f["현재목표시간"]
            ? Number(f["현재목표시간"])
            : null,
          targetHours: f["도전목표시간"]
            ? Number(f["도전목표시간"])
            : null,
          waitTime: f["대기시간(관리팀추가)"]
            ? Number(f["대기시간(관리팀추가)"])
            : null,
          note: (f["비고"] as string) || null,
        },
      });

      progress.recordMaps.counselors[rec.id] = counselor.id;
    } catch (err: any) {
      progress.errors.push({
        table: "Counselors",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  if (!progress.completedTables.includes("Counselors")) {
    progress.completedTables.push("Counselors");
  }
  saveProgress(progress);
  log(
    `  📋 Counselors 완료: ${Object.keys(progress.recordMaps.counselors).length}건`
  );
}

// ─── Videos 마이그레이션 ─────────────────────────────────
async function migrateVideos(
  base: Airtable.Base,
  prisma: PrismaClient,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [3/6] Videos 마이그레이션 시작 (443건)");
  const records = await fetchAllRecords(base, TABLE_IDS.Videos);
  log(`  총 ${records.length}건 로드됨`);

  // Category 시드: 고유 값 추출 → DB 삽입
  const categories = new Set<string>();
  for (const rec of records) {
    const cat = rec.fields["카테고리"] as string;
    if (cat) categories.add(cat);
  }

  log(`  카테고리 ${categories.size}개 발견: ${[...categories].join(", ")}`);

  const categoryMap: Record<string, string> = {};
  if (!dryRun) {
    for (const catName of categories) {
      const slug = catName
        .replace(/\s+/g, "-")
        .replace(/[^\w가-힣-]/g, "")
        .toLowerCase();
      const existing = await prisma.category.findUnique({
        where: { name: catName },
      });
      if (existing) {
        categoryMap[catName] = existing.id;
      } else {
        const cat = await prisma.category.create({
          data: { name: catName, slug: slug || catName },
        });
        categoryMap[catName] = cat.id;
      }
    }
    log(`  ✅ 카테고리 ${Object.keys(categoryMap).length}개 시드 완료`);
  }

  // 상담사이름 → counselorId 매핑용 캐시
  const counselorNameCache: Record<string, string> = {};
  if (!dryRun) {
    const allCounselors = await prisma.counselor.findMany({
      select: { id: true, displayName: true },
    });
    for (const c of allCounselors) {
      counselorNameCache[c.displayName] = c.id;
    }
  }

  // ADMIN의 Prisma ID (ownerId 폴백용)
  const adminUser = dryRun
    ? null
    : await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const adminId = adminUser?.id || "admin-fallback";

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["영상ID"] as string;
    const title = (f["최종제목"] as string) || "제목 없음";

    if (progress.recordMaps.videos[rec.id]) {
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId} / ${title}`);
        progress.recordMaps.videos[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 담당제작자 → ownerId
      const starRecIds = (f["담당제작자(STAR)"] as string[]) || [];
      let ownerId = adminId;
      if (starRecIds.length > 0 && progress.recordMaps.users[starRecIds[0]]) {
        ownerId = progress.recordMaps.users[starRecIds[0]];
      }

      // 카테고리
      const catName = f["카테고리"] as string;
      const categoryId = catName ? categoryMap[catName] || null : null;

      // 상태 매핑
      const statusRaw = (f["상태"] as string) || "";
      let status: "DRAFT" | "PENDING" | "APPROVED" | "FINAL" = "DRAFT";
      if (statusRaw.includes("통과") || statusRaw.includes("APPROVED"))
        status = "APPROVED";
      else if (statusRaw.includes("검수") || statusRaw.includes("PENDING"))
        status = "PENDING";
      else if (statusRaw.includes("FINAL") || statusRaw.includes("최종"))
        status = "FINAL";

      // 영상주체 매핑
      const subjectRaw = (f["영상주체"] as string) || "";
      let videoSubject: "COUNSELOR" | "BRAND" | "OTHER" | null = null;
      if (subjectRaw) videoSubject = "OTHER"; // 기본
      // 상담사이름이 있으면 COUNSELOR
      if (f["상담사이름"]) videoSubject = "COUNSELOR";

      // 상담사 연결
      const counselorName = f["상담사이름"] as string;
      let counselorId: string | null = null;
      if (counselorName && counselorNameCache[counselorName]) {
        counselorId = counselorNameCache[counselorName];
      }

      // 썸네일
      const thumbnails = f["썸네일URL"] as any[];
      const thumbnailUrl =
        thumbnails && thumbnails.length > 0 ? thumbnails[0]?.url : null;

      const video = await prisma.video.create({
        data: {
          externalId: externalId || null,
          title,
          description: (f["제작의도/설명"] as string) || null,
          lyrics: (f["가사"] as string) || null,
          videoSubject,
          categoryId,
          status,
          thumbnailUrl,
          ownerId,
          counselorId,
          createdAt: f["생성일"]
            ? new Date(f["생성일"] as string)
            : new Date(),
        },
      });

      progress.recordMaps.videos[rec.id] = video.id;
    } catch (err: any) {
      progress.errors.push({
        table: "Videos",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  if (!progress.completedTables.includes("Videos")) {
    progress.completedTables.push("Videos");
  }
  saveProgress(progress);
  log(
    `  📋 Videos 완료: ${Object.keys(progress.recordMaps.videos).length}건`
  );
}

// ─── Submissions 마이그레이션 ────────────────────────────
async function migrateSubmissions(
  base: Airtable.Base,
  prisma: PrismaClient,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [4/6] Submissions 마이그레이션 시작 (443건)");
  const records = await fetchAllRecords(base, TABLE_IDS.submissions);
  log(`  총 ${records.length}건 로드됨`);

  // ADMIN id for fallback starId
  const adminUser = dryRun
    ? null
    : await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const adminId = adminUser?.id || "admin-fallback";

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["제출ID"] as string;

    if (progress.recordMaps.submissions[rec.id]) {
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId}`);
        progress.recordMaps.submissions[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 영상 연결
      const videoRecIds = (f["영상"] as string[]) || [];
      let videoId: string | null = null;
      if (
        videoRecIds.length > 0 &&
        progress.recordMaps.videos[videoRecIds[0]]
      ) {
        videoId = progress.recordMaps.videos[videoRecIds[0]];
      }

      // 검수자 연결
      const reviewerRecIds = (f["검수자"] as string[]) || [];
      let reviewerId: string | null = null;
      if (
        reviewerRecIds.length > 0 &&
        progress.recordMaps.users[reviewerRecIds[0]]
      ) {
        reviewerId = progress.recordMaps.users[reviewerRecIds[0]];
      }

      // starId: 영상의 owner를 찾거나 admin 폴백
      let starId = adminId;
      if (videoId) {
        const video = await prisma.video.findUnique({
          where: { id: videoId },
          select: { ownerId: true },
        });
        if (video) starId = video.ownerId;
      }

      // status 매핑
      const statusEn = (f["status(영문)"] as string) || "PENDING";
      let status: "PENDING" | "IN_REVIEW" | "REVISED" | "APPROVED" | "REJECTED" =
        "PENDING";
      if (statusEn.includes("IN_REVIEW")) status = "IN_REVIEW";
      else if (statusEn.includes("REVISED")) status = "REVISED";
      else if (statusEn.includes("APPROVED")) status = "APPROVED";
      else if (statusEn.includes("REJECTED")) status = "REJECTED";

      // 첨부파일 URL
      const attachments = f["제출파일URL"] as any[];
      const fileUrl =
        attachments && attachments.length > 0 ? attachments[0]?.url : null;

      const thumbAttachments = f["썸네일URL"] as any[];
      const thumbnailUrl =
        thumbAttachments && thumbAttachments.length > 0
          ? thumbAttachments[0]?.url
          : null;

      const submission = await prisma.submission.create({
        data: {
          externalId: externalId || null,
          versionSlot: (f["버전슬롯"] as number) || 1,
          version: (f["버전명"] as string) || "v1.0",
          versionTitle: (f["버전제목"] as string) || null,
          status,
          statusKo: (f["검수상태(한글)"] as string) || null,
          thumbnailUrl,
          fileUrl,
          summaryFeedback: (f["요약피드백"] as string) || null,
          starId,
          videoId,
          reviewerId,
          submittedAt: f["제출일"] ? new Date(f["제출일"] as string) : null,
          reviewedAt: f["체크일"] ? new Date(f["체크일"] as string) : null,
          approvedAt: f["통과일"] ? new Date(f["통과일"] as string) : null,
        },
      });

      progress.recordMaps.submissions[rec.id] = submission.id;
    } catch (err: any) {
      progress.errors.push({
        table: "submissions",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  if (!progress.completedTables.includes("submissions")) {
    progress.completedTables.push("submissions");
  }
  saveProgress(progress);
  log(
    `  📋 Submissions 완료: ${Object.keys(progress.recordMaps.submissions).length}건`
  );
}

// ─── Feedbacks 마이그레이션 ──────────────────────────────
async function migrateFeedbacks(
  base: Airtable.Base,
  prisma: PrismaClient,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [5/6] Feedbacks 마이그레이션 시작 (74건)");
  const records = await fetchAllRecords(base, TABLE_IDS.feedbacks);
  log(`  총 ${records.length}건 로드됨`);

  // ADMIN id for fallback
  const adminUser = dryRun
    ? null
    : await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  const adminId = adminUser?.id || "admin-fallback";

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["피드백ID"] as string;

    if (progress.recordMaps.feedbacks[rec.id]) {
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId}`);
        progress.recordMaps.feedbacks[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 제출물 연결
      const subRecIds = (f["제출"] as string[]) || [];
      let submissionId: string | null = null;
      if (
        subRecIds.length > 0 &&
        progress.recordMaps.submissions[subRecIds[0]]
      ) {
        submissionId = progress.recordMaps.submissions[subRecIds[0]];
      }

      if (!submissionId) {
        log(`  ⚠ ${externalId}: 제출물 연결 없음 — 건너뜀`);
        continue;
      }

      // 작성자 연결
      const authorRecIds = (f["작성자"] as string[]) || [];
      let authorId = adminId;
      if (
        authorRecIds.length > 0 &&
        progress.recordMaps.users[authorRecIds[0]]
      ) {
        authorId = progress.recordMaps.users[authorRecIds[0]];
      }

      // 구분 매핑 → FeedbackType
      const categoryRaw = (f["구분"] as string) || "";
      let feedbackType: "SUBTITLE" | "BGM" | "CUT_EDIT" | "COLOR_GRADE" | "GENERAL" = "GENERAL";
      if (categoryRaw.includes("자막")) feedbackType = "SUBTITLE";
      else if (categoryRaw.includes("BGM")) feedbackType = "BGM";
      else if (categoryRaw.includes("컷편집")) feedbackType = "CUT_EDIT";
      else if (categoryRaw.includes("색보정")) feedbackType = "COLOR_GRADE";

      // 타임코드 파싱 (00:13~00:18 → startTime/endTime)
      const timecodeRaw = (f["타임코드"] as string) || "";
      let startTime: number | null = null;
      let endTime: number | null = null;
      if (timecodeRaw) {
        const parts = timecodeRaw.split("~");
        if (parts[0]) {
          const [m, s] = parts[0].trim().split(":").map(Number);
          if (!isNaN(m) && !isNaN(s)) startTime = m * 60 + s;
        }
        if (parts[1]) {
          const [m, s] = parts[1].trim().split(":").map(Number);
          if (!isNaN(m) && !isNaN(s)) endTime = m * 60 + s;
        }
      }

      // 해결상태 → FeedbackStatus
      const resolvedRaw = (f["해결상태"] as string) || "";
      let feedbackStatus: "PENDING" | "RESOLVED" | "WONTFIX" = "PENDING";
      if (resolvedRaw.includes("해결")) feedbackStatus = "RESOLVED";
      else if (resolvedRaw.includes("보류")) feedbackStatus = "WONTFIX";

      const feedback = await prisma.feedback.create({
        data: {
          type: feedbackType,
          status: feedbackStatus,
          content: (f["내용"] as string) || "",
          startTime,
          endTime,
          submissionId,
          authorId,
        },
      });

      progress.recordMaps.feedbacks[rec.id] = feedback.id;
    } catch (err: any) {
      progress.errors.push({
        table: "feedbacks",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  if (!progress.completedTables.includes("feedbacks")) {
    progress.completedTables.push("feedbacks");
  }
  saveProgress(progress);
  log(
    `  📋 Feedbacks 완료: ${Object.keys(progress.recordMaps.feedbacks).length}건`
  );
}

// ─── MediaPlacements 마이그레이션 ────────────────────────
async function migrateMediaPlacements(
  base: Airtable.Base,
  prisma: PrismaClient,
  progress: Progress,
  dryRun: boolean
) {
  log("\n📋 [6/6] MediaPlacements 마이그레이션 시작 (24건)");
  const records = await fetchAllRecords(base, TABLE_IDS.MediaPlacements);
  log(`  총 ${records.length}건 로드됨`);

  for (const rec of records) {
    const f = rec.fields;
    const externalId = f["집행ID"] as string;

    if (progress.recordMaps.mediaPlacements[rec.id]) {
      continue;
    }

    try {
      if (dryRun) {
        log(`  [DRY] ${externalId}`);
        progress.recordMaps.mediaPlacements[rec.id] = `dry-${externalId}`;
        continue;
      }

      // 영상 연결
      const videoRecIds = (f["영상"] as string[]) || [];
      let videoId: string | null = null;
      if (
        videoRecIds.length > 0 &&
        progress.recordMaps.videos[videoRecIds[0]]
      ) {
        videoId = progress.recordMaps.videos[videoRecIds[0]];
      }

      if (!videoId) {
        log(`  ⚠ ${externalId}: 영상 연결 없음 — 건너뜀`);
        continue;
      }

      // 상태 매핑
      const statusRaw = (f["상태"] as string) || "";
      let status: "READY" | "ACTIVE" | "COMPLETED" | "PAUSED" = "READY";
      if (statusRaw.includes("진행")) status = "ACTIVE";
      else if (statusRaw.includes("종료") || statusRaw.includes("완료"))
        status = "COMPLETED";
      else if (statusRaw.includes("중단")) status = "PAUSED";

      const mp = await prisma.mediaPlacement.create({
        data: {
          externalId: externalId || null,
          videoId,
          medium: (f["매체"] as string) || "기타",
          placementType: (f["집행유형"] as string) || null,
          status,
          campaignName: (f["캠페인명"] as string) || null,
          channel: (f["계정/채널"] as string) || null,
          startDate: f["시작일"] ? new Date(f["시작일"] as string) : null,
          endDate: f["종료일"] ? new Date(f["종료일"] as string) : null,
          url: (f["URL"] as string) || null,
          budget: f["예산"] ? Number(f["예산"]) || null : null,
          performance: (f["성과요약"] as string) || null,
          note: (f["비고"] as string) || null,
        },
      });

      progress.recordMaps.mediaPlacements[rec.id] = mp.id;
    } catch (err: any) {
      progress.errors.push({
        table: "MediaPlacements",
        recordId: rec.id,
        error: err.message,
      });
      log(`  ❌ ${externalId}: ${err.message}`);
    }
  }

  if (!progress.completedTables.includes("MediaPlacements")) {
    progress.completedTables.push("MediaPlacements");
  }
  saveProgress(progress);
  log(
    `  📋 MediaPlacements 완료: ${Object.keys(progress.recordMaps.mediaPlacements).length}건`
  );
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
