# 마이그레이션 스크립트 설계

> 에어테이블 → Supabase + Cloudflare Stream + Cloudflare R2
> 400건+ 영상 데이터 일괄 이전

---

## 1. 사전 준비

### 필요한 접근 권한

| 서비스 | 필요 항목 |
|--------|----------|
| Airtable | Personal Access Token + Base ID + Table Name |
| Cloudflare Stream | Account ID + API Token (Stream:Edit 권한) |
| Cloudflare R2 | Access Key + Secret Key + Bucket 이름 |
| Supabase | DATABASE_URL (직접 연결, 포트 5432) |

### 환경 변수 (.env.migration)

```env
# Airtable
AIRTABLE_API_KEY=pat_xxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Videos

# Cloudflare (기존 .env.local과 동일)
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=hamkkebom-star-backup
CLOUDFLARE_R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Database (직접 연결 — 마이그레이션용)
DIRECT_URL="postgresql://postgres.xxx:xxx@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

---

## 2. 에어테이블 데이터 구조 파악

### 사전 조사 필요 항목

스크립트 작성 전 에어테이블 테이블의 실제 필드명을 확인해야 합니다:

| 예상 필드 | 용도 | 매핑 대상 |
|-----------|------|-----------|
| Name / Title | 영상 제목 | Video.title |
| Description | 설명 | Video.description |
| Category | 분류 | Video.categoryId (Category 룩업) |
| Attachments | 영상 파일 (첨부) | Cloudflare Stream + R2 |
| Creator | 제작자 | Video.ownerId (User 룩업) |
| Status | 상태 | Video.status |
| Created | 생성일 | Video.createdAt |

> **중요**: 에어테이블 첨부파일 URL은 2시간 후 만료됩니다. 스크립트가 URL을 가져온 즉시 다운로드해야 합니다.

---

## 3. 마이그레이션 흐름

```
Phase 1: 준비
├── Prisma 마이그레이션 실행 (스키마 반영)
├── Category 시드 데이터 삽입
└── ADMIN 사용자 생성 (없으면)

Phase 2: 데이터 추출
├── Airtable API로 전체 레코드 조회 (페이지네이션)
└── 레코드별 필드 + 첨부파일 URL 수집

Phase 3: 영상 이전 (레코드별 반복)
├── 1. 첨부파일 URL로 영상 다운로드 (임시 파일)
├── 2. Cloudflare R2에 원본 업로드 → r2Key 획득
├── 3. Cloudflare Stream에 업로드 (URL copy) → streamUid 획득
├── 4. Stream API에서 기술 스펙 조회 (duration, codec 등)
├── 5. Supabase DB에 Video + VideoTechnicalSpec 삽입
└── 6. 임시 파일 삭제

Phase 4: 검증
├── DB 레코드 수 == Airtable 레코드 수 확인
├── 랜덤 샘플 10건 영상 재생 확인
└── R2 백업 파일 존재 확인
```

---

## 4. 스크립트 구조

### `scripts/migrate-airtable.ts`

```typescript
// 의사 코드 (pseudo-code)

import Airtable from 'airtable';
import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// --- 설정 ---
const BATCH_SIZE = 10;          // 동시 처리 건수
const RETRY_COUNT = 3;          // 실패 시 재시도
const PROGRESS_FILE = './migration-progress.json';  // 진행 상황 저장

// --- 메인 흐름 ---
async function main() {
  // 1. 진행 상황 복원 (중단된 경우)
  const progress = loadProgress();
  
  // 2. Airtable 전체 레코드 조회
  const records = await fetchAllAirtableRecords();
  console.log(`총 ${records.length}건 중 ${progress.completed}건 완료`);
  
  // 3. 미처리 레코드 필터링
  const pending = records.filter(r => !progress.completedIds.includes(r.id));
  
  // 4. 배치 처리
  for (const batch of chunk(pending, BATCH_SIZE)) {
    await Promise.allSettled(
      batch.map(record => migrateRecord(record, progress))
    );
    saveProgress(progress);
  }
  
  // 5. 결과 보고
  printReport(progress);
}

// --- 단일 레코드 마이그레이션 ---
async function migrateRecord(record, progress) {
  const { title, description, category, attachments, creator } = parseRecord(record);
  
  if (!attachments?.length) {
    progress.skipped.push({ id: record.id, reason: '첨부파일 없음' });
    return;
  }
  
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      // 1. 첨부파일 다운로드
      const fileBuffer = await downloadFile(attachments[0].url);
      const fileName = attachments[0].filename;
      
      // 2. R2 백업 업로드
      const r2Key = `backup/${record.id}/${fileName}`;
      await uploadToR2(r2Key, fileBuffer);
      
      // 3. Cloudflare Stream 업로드 (URL copy 방식)
      const streamResult = await uploadToStream(attachments[0].url, {
        name: title
      });
      const streamUid = streamResult.uid;
      
      // 4. Stream 기술 스펙 조회 (업로드 완료 대기 필요)
      const specs = await waitForStreamReady(streamUid);
      
      // 5. DB 삽입
      const categoryRecord = await findOrCreateCategory(category);
      const owner = await findUserByName(creator);
      
      await prisma.video.create({
        data: {
          title,
          description,
          categoryId: categoryRecord?.id,
          status: 'APPROVED',  // 기존 영상은 승인 상태
          streamUid,
          r2Key,
          thumbnailUrl: specs.thumbnail,
          ownerId: owner?.id ?? adminUserId,
          technicalSpec: {
            create: {
              filename: fileName,
              format: specs.format,
              fileSize: specs.size,
              width: specs.width,
              height: specs.height,
              duration: specs.duration,
              videoCodec: specs.videoCodec,
              audioCodec: specs.audioCodec,
            }
          }
        }
      });
      
      // 성공
      progress.completedIds.push(record.id);
      progress.completed++;
      console.log(`[${progress.completed}/${total}] ${title} ✅`);
      return;
      
    } catch (error) {
      console.error(`[시도 ${attempt}/${RETRY_COUNT}] ${title} 실패:`, error.message);
      if (attempt === RETRY_COUNT) {
        progress.failed.push({ id: record.id, title, error: error.message });
      }
    }
  }
}
```

---

## 5. 핵심 함수

### Airtable 조회

```typescript
async function fetchAllAirtableRecords() {
  const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);
  const records = [];
  
  await base(AIRTABLE_TABLE_NAME)
    .select({ pageSize: 100 })
    .eachPage((page, fetchNextPage) => {
      records.push(...page);
      fetchNextPage();
    });
  
  return records;
}
```

### Cloudflare Stream 업로드 (URL copy)

```typescript
async function uploadToStream(sourceUrl: string, meta: { name: string }) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: sourceUrl,
        meta: { name: meta.name },
        requireSignedURLs: true,
      }),
    }
  );
  const data = await response.json();
  return data.result;  // { uid, ... }
}
```

### Cloudflare R2 업로드

```typescript
async function uploadToR2(key: string, buffer: Buffer) {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
  }));
}
```

### Stream 처리 완료 대기

```typescript
async function waitForStreamReady(uid: string, maxWait = 300_000) {
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${uid}`,
      { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
    );
    const data = await res.json();
    const video = data.result;
    
    if (video.status?.state === 'ready') {
      return {
        duration: video.duration,
        width: video.input?.width,
        height: video.input?.height,
        thumbnail: video.thumbnail,
        format: 'mp4',
        size: video.size,
        videoCodec: video.input?.videoCodec,
        audioCodec: video.input?.audioCodec,
      };
    }
    
    await sleep(5000);  // 5초 대기
  }
  
  throw new Error(`Stream ${uid} 처리 타임아웃`);
}
```

---

## 6. 안전장치

| 장치 | 설명 |
|------|------|
| **진행 상황 파일** | `migration-progress.json`에 완료/실패 ID 저장. 중단 후 재시작 시 이어서 처리 |
| **재시도** | 건당 최대 3회 재시도 (네트워크 오류 대비) |
| **배치 처리** | 10건씩 병렬 처리 (Cloudflare API Rate Limit 고려) |
| **중복 방지** | 이미 완료된 ID는 스킵 |
| **건별 독립** | 1건 실패해도 나머지 계속 진행 |
| **결과 보고** | 완료/스킵/실패 건수 + 실패 목록 출력 |

---

## 7. 실행 방법

```bash
# 1. 의존성 설치
pnpm add -D airtable @aws-sdk/client-s3 dotenv tsx

# 2. 환경 변수 준비
cp .env.migration.example .env.migration

# 3. Prisma 마이그레이션 (스키마가 DB에 반영되어야 함)
npx prisma migrate deploy

# 4. 마이그레이션 실행
npx tsx scripts/migrate-airtable.ts

# 5. 검증
npx tsx scripts/verify-migration.ts
```

---

## 8. 검증 스크립트 (`scripts/verify-migration.ts`)

```typescript
async function verify() {
  // 1. 건수 확인
  const dbCount = await prisma.video.count();
  console.log(`DB 영상 수: ${dbCount}`);
  
  // 2. Stream UID 유효성 (랜덤 10건)
  const samples = await prisma.video.findMany({ take: 10 });
  for (const video of samples) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${video.streamUid}`,
      { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
    );
    const data = await res.json();
    const ok = data.result?.status?.state === 'ready';
    console.log(`  ${video.title}: Stream ${ok ? '✅' : '❌'}`);
  }
  
  // 3. R2 백업 존재 확인 (랜덤 10건)
  for (const video of samples) {
    if (video.r2Key) {
      const exists = await checkR2Exists(video.r2Key);
      console.log(`  ${video.title}: R2 ${exists ? '✅' : '❌'}`);
    }
  }
  
  // 4. 기술 스펙 존재 확인
  const specCount = await prisma.videoTechnicalSpec.count();
  console.log(`기술 스펙: ${specCount}/${dbCount}`);
}
```

---

## 9. 예상 소요 시간

| 단계 | 예상 시간 |
|------|-----------|
| Airtable API 조회 | ~1분 |
| 영상 다운로드 + 업로드 (400건) | ~2~4시간 (파일 크기에 따라) |
| Stream 처리 대기 | 건당 30초~5분 |
| DB 삽입 | ~1분 |
| **총 예상** | **3~5시간** |

> 배치 크기(BATCH_SIZE)를 조절하여 속도 조정 가능. Cloudflare API Rate Limit (1200 req/5min) 주의.
