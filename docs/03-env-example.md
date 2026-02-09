# 환경 변수 템플릿

> `.env.example` 파일 내용. 프로젝트 루트에 `.env.local`로 복사하여 사용.

```env
# ============================================================
# Supabase
# ============================================================
# Supabase 프로젝트 설정 > API에서 확인
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx

# ============================================================
# Database (Prisma)
# ============================================================
# Supavisor 트랜잭션 모드 (런타임 — 서버리스 최적화)
# 포트 6543, pgbouncer=true, connection_limit=1
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# 직접 연결 (Prisma CLI 마이그레이션 전용)
# 포트 5432
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

# ============================================================
# Cloudflare Stream
# ============================================================
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token-with-stream-edit
# signed URL 생성용 키 (Stream > Signing Keys에서 생성)
CLOUDFLARE_STREAM_SIGNING_KEY_ID=your-key-id
CLOUDFLARE_STREAM_SIGNING_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# ============================================================
# Cloudflare R2
# ============================================================
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key
CLOUDFLARE_R2_BUCKET_NAME=hamkkebom-star-backup
CLOUDFLARE_R2_ENDPOINT=https://[ACCOUNT_ID].r2.cloudflarestorage.com

# ============================================================
# Sentry
# ============================================================
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/654321
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=hamkkebom-star

# ============================================================
# App
# ============================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 환경 변수 설명

| 변수 | 공개 | 필수 | 설명 |
|------|:----:|:----:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | O | O | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | O | O | Supabase 공개 키 (anon key 후속) |
| `DATABASE_URL` | X | O | Prisma 런타임 연결 (Supavisor 풀링) |
| `DIRECT_URL` | X | O | Prisma CLI 마이그레이션용 직접 연결 |
| `CLOUDFLARE_ACCOUNT_ID` | X | O | Cloudflare 계정 ID |
| `CLOUDFLARE_API_TOKEN` | X | O | Stream/R2 API 토큰 |
| `CLOUDFLARE_STREAM_SIGNING_KEY_ID` | X | O | signed URL 서명 키 ID |
| `CLOUDFLARE_STREAM_SIGNING_KEY_PEM` | X | O | signed URL 서명 PEM 키 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | X | O | R2 접근 키 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | X | O | R2 비밀 키 |
| `CLOUDFLARE_R2_BUCKET_NAME` | X | O | R2 버킷 이름 |
| `CLOUDFLARE_R2_ENDPOINT` | X | O | R2 엔드포인트 |
| `SENTRY_DSN` | X | △ | Sentry DSN (프로덕션 필수) |
| `SENTRY_AUTH_TOKEN` | X | △ | Sentry 소스맵 업로드용 |
| `SENTRY_ORG` | X | △ | Sentry 조직명 |
| `SENTRY_PROJECT` | X | △ | Sentry 프로젝트명 |
| `NEXT_PUBLIC_APP_URL` | O | O | 앱 기본 URL |

## 마이그레이션 전용 추가 변수

에어테이블 마이그레이션 스크립트 실행 시에만 필요:

```env
# Airtable (마이그레이션 전용 — .env.migration)
AIRTABLE_API_KEY=pat_xxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Videos
```
