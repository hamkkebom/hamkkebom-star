# CORE LIBRARY (src/lib/)

프로젝트 핵심 모듈. 인증, DB, 외부 서비스, 검증 스키마.

## STRUCTURE

```
lib/
├── supabase/
│   ├── client.ts       # createBrowserClient (클라이언트 사이드)
│   ├── server.ts       # createServerClient + cookies() (서버 사이드)
│   └── middleware.ts    # updateSession — 세션 갱신 + role 리다이렉트
├── cloudflare/
│   ├── stream.ts       # CF Stream API (tus 업로드, 상태조회, 서명URL, 삭제)
│   └── r2.ts           # CF R2 스토리지 (설정 반환, 공용 URL)
├── validations/
│   ├── auth.ts         # login, signup, forgotPassword, resetPassword
│   ├── project-request.ts  # createRequest, updateRequest
│   ├── submission.ts   # createSubmission, updateSubmission, uploadUrl
│   ├── feedback.ts     # createFeedback, updateFeedback
│   ├── video.ts        # updateVideo, videoUploadUrl
│   ├── portfolio.ts    # updatePortfolio, createItem, reorderItems
│   └── settlement.ts   # generateSettlement, adjustItem
├── prisma.ts           # PrismaClient 싱글턴 (PrismaPg adapter)
├── auth-helpers.ts     # getAuthUser() (⚠️ bypass 중)
└── utils.ts            # cn() — clsx + tailwind-merge
```

## PRISMA CLIENT

```typescript
// lib/prisma.ts — 싱글턴 패턴
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
```

- **반드시** `@prisma/adapter-pg` 사용 (native client 금지)
- Supavisor 포트 6543 (런타임), 포트 5432 (Prisma CLI 전용 DIRECT_URL)
- dev 환경 globalThis 캐싱으로 hot-reload 시 연결 재사용

## AUTH HELPERS

```typescript
// ⚠️ 현재 BYPASS — mock ADMIN 반환
// 원래: Supabase authUser.id → prisma.user.findUnique({ authId })
export async function getAuthUser(): Promise<User | null>
```

**bypass 복원 파일 4개**: middleware.ts, auth-helpers.ts, hooks/use-auth.ts, api/users/me/route.ts
모든 파일에 원래 코드가 주석으로 보존됨.

## SUPABASE SSR 패턴

| 파일 | 용도 | 사용처 |
|------|------|--------|
| `client.ts` | `createBrowserClient()` | 클라이언트 컴포넌트 (로그인, 로그아웃) |
| `server.ts` | `createServerClient()` + cookies() | Server Components, API Routes |
| `middleware.ts` | `updateSession()` 세션 갱신 | src/middleware.ts |

**핵심 규칙**: `supabase.auth.getUser()` 앞에 코드 삽입 금지 — 세션 갱신 간섭

**Key 이름**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key 아님)

## CLOUDFLARE STREAM

```typescript
// lib/cloudflare/stream.ts
export async function createTusUploadUrl(maxDuration?): Promise<{ uploadUrl, uid }>
export async function getVideoStatus(uid): Promise<VideoInfo | null>
export async function getSignedPlaybackUrl(uid): Promise<string>
export async function deleteVideo(uid): Promise<boolean>
```

- env가 "placeholder"이면 **mock 모드** 자동 전환
- `isConfigured()` 내부 체크로 개발 환경 대응
- tus 프로토콜: Direct Creator Upload 방식

## CLOUDFLARE R2

```typescript
// lib/cloudflare/r2.ts
export function getR2Config(): R2Config | null  // 설정 반환 (미설정 시 null)
export function getPublicUrl(key: string): string  // 공용 URL 생성
```

- 현재 placeholder 구조. 향후 영상 원본 백업용.

## VALIDATION SCHEMAS (Zod)

모든 스키마 패턴:
```typescript
import { z } from "zod";

export const createSomethingSchema = z.object({
  title: z.string().trim().min(2, "제목은 2자 이상이어야 합니다."),
  // ... 필드별 한국어 에러 메시지
});

export const updateSomethingSchema = createSomethingSchema.partial();

export type CreateSomethingInput = z.infer<typeof createSomethingSchema>;
```

| 파일 | 주요 스키마 | 특이사항 |
|------|-------------|----------|
| `auth.ts` | login, signup, forgot/reset password | confirmPassword .refine() 일치 검증 |
| `project-request.ts` | create/update request | deadline string→Date refine |
| `submission.ts` | create/update submission, uploadUrl | versionSlot 1~5 범위 |
| `feedback.ts` | create/update feedback | type/priority enum, startTime/endTime optional |
| `video.ts` | updateVideo, videoUploadUrl | maxDurationSeconds 기본 600 |
| `portfolio.ts` | updatePortfolio, createItem, reorder | socialLinks JSON, sortOrder 배열 |
| `settlement.ts` | generate, adjustItem | year 2020~2100, month 1~12 |

## CONVENTIONS

- 에러 메시지 **한국어** (Zod message 파라미터)
- `z.string().trim()` 기본 (공백 제거)
- partial() 패턴: update = create.partial()
- type export: `z.infer<typeof schema>`
- 새 도메인 추가 시 `validations/{domain}.ts` 생성

## ANTI-PATTERNS

- Prisma native client import 금지 → `@/lib/prisma` 사용
- Supabase client를 서버에서 직접 생성 금지 → `@/lib/supabase/server` 사용
- 검증 로직을 API route에 인라인 금지 → `validations/` 분리
- env 직접 참조 금지 (CF) → `isConfigured()` 체크 후 사용
