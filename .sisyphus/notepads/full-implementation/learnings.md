# Learnings — full-implementation

**시작일**: 2026-02-10

---

## 컨벤션 & 패턴

(작업 진행 중 발견한 코드 컨벤션, 패턴을 여기 기록)

## [2026-02-10T16:04:53+09:00] Task 1.1: Supabase SSR Next.js 16 Proxy 패턴 적용
- Supabase 공식 Next.js SSR 문서(creating-a-client)는 Next.js 16에서 루트 `proxy.ts` + `supabase.auth.getClaims()` 기반 세션 갱신 패턴을 권장함.
- `@supabase/ssr` 0.8.0 + Next.js 16.1.6 조합에서 `createServerClient(..., { cookies: { getAll, setAll } })` 패턴은 그대로 유효하며, 서버 컴포넌트의 `setAll`은 try/catch로 무시하는 공식 예제와 동일하게 유지해야 함.
- Proxy의 신뢰 기준: `getSession()`은 서버 보호 로직에서 신뢰하지 말고, JWT 재검증을 수행하는 `getClaims()`를 사용해야 함.
- 기존 `updateSession`의 핵심 흐름(쿠키 갱신, 비인증 로그인 리다이렉트, `/` 진입 시 role 기반 리다이렉트)은 유지하고, claims에서 `sub`/metadata를 우선 사용하되 role 미존재 시 DB fallback으로 보완하는 형태가 안전함.
- 호환성 적용 방식: `src/lib/supabase/proxy.ts`에 최신 로직을 두고 `src/lib/supabase/middleware.ts`는 re-export로 유지하면 기존 import 경로와 신규 proxy 네이밍을 동시에 만족시킬 수 있음.

## [2026-02-10T16:15:00+09:00] Task 1.2: Auth Bypass 복원 (5개 파일)

### 복원 완료 파일 (모두 LSP clean)

1. **src/middleware.ts** (8줄)
   - 변경: `NextResponse.next()` bypass → `updateSession(request)` 호출
   - import: `@/lib/supabase/middleware`에서 `updateSession` 가져옴
   - 주석 블록 완전 제거

2. **src/lib/auth-helpers.ts** (13줄)
   - 변경: `prisma.user.findFirst({ role: "ADMIN" })` bypass → Supabase authUser.id 기반 조회
   - 패턴: `supabase.auth.getUser()` → `authUser.id` → `prisma.user.findUnique({ authId })`
   - import 추가: `createClient` from `@/lib/supabase/server`

3. **src/hooks/use-auth.ts** (33줄)
   - 변경: 직접 `fetchUser()` 호출 → Supabase `onAuthStateChange` 리스너
   - 패턴: `getSession()` 초기 체크 + `onAuthStateChange` 구독 + cleanup
   - import 추가: `createClient` from `@/lib/supabase/client`
   - `clearUser` 함수 복원 (useAuthStore에서 가져옴)

4. **src/app/api/users/me/route.ts** (119줄)
   - GET: 주석 코드 복원 + Supabase 인증 추가
   - PATCH: 원본 미보존 → GET 패턴 기반으로 재구성
     - Supabase authUser.id 검증
     - Prisma user 조회 (authId 기반)
     - Zod 검증 (updateUserSchema)
     - 응답 형식: `{ data: user }` (API 컨벤션)
   - 에러 응답: `{ error: { code, message } }` 형식으로 통일

5. **src/components/auth/login-form.tsx** (244줄)
   - 변경: 167~190줄 amber bypass UI 블록 완전 제거
   - 로그인 폼 자체는 이미 Supabase `signInWithPassword` 사용 중 → 유지
   - 나머지 UI 구조 변경 없음

### 주의사항 & 패턴

- **middleware.ts**: `updateSession(request)` 호출 시 proxy.ts의 `getClaims()` 기반 인증 사용 (getSession() 아님)
- **auth-helpers.ts**: `getAuthUser()` null 반환 가능 → API route에서 401 체크 필수
- **use-auth.ts**: `onAuthStateChange` 구독 해제 필수 (cleanup 함수)
- **users/me/route.ts**: 
  - GET/PATCH 모두 Supabase 인증 필수
  - 응답 형식 통일: `{ data: T }` (성공) / `{ error: { code, message } }` (실패)
  - PATCH는 원본 미보존이었으므로 GET 패턴 정확히 따름
- **login-form.tsx**: bypass UI 제거 후 실제 Supabase 로그인 폼만 남음

### 빌드 상태

- LSP diagnostics: 5개 파일 모두 clean ✓
- 빌드 실행 금지: Task 1.3 (역할 가드) 적용 전까지 bypass 제거 시 mock ADMIN 없어서 STAR 대시보드 접근 불가
- Task 1.3 후 함께 검증 필요

### 다음 단계

- Task 1.3: 역할 가드 추가 (layout에서 role 체크)
- Task 1.4: 통합 검증 (빌드 + 로그인 플로우)

## [2026-02-10T16:30:00+09:00] Task 1.3: STAR 역할 가드 추가 (dashboard layout)

### 역할 가드 패턴 (Server Component)

**패턴**: `src/app/(admin)/layout.tsx`와 동일한 구조를 STAR용으로 적용

```typescript
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const user = await getAuthUser();
  
  if (!user || user.role !== "STAR") {
    redirect("/");
  }
  
  // ... 레이아웃 렌더링
}
```

**핵심 요소**:
1. `async function` 선언 (Server Component)
2. `getAuthUser()` 호출 → null 체크 + role 체크
3. role 불일치 시 `redirect("/")` (루트로 리다이렉트)
4. ADMIN 패턴과 유일한 차이: `user.role !== "ADMIN"` → `user.role !== "STAR"`

### 적용 결과

- **파일**: `src/app/(dashboard)/layout.tsx`
- **변경사항**:
  - import 추가: `getAuthUser`, `redirect`
  - function 선언: `function` → `async function`
  - 역할 가드 로직 추가 (11~15줄)
  - 기존 레이아웃 구조 유지
- **LSP 검증**: clean ✓

### 의미

- STAR 사용자만 `/stars/*` 대시보드 접근 가능
- ADMIN 또는 미인증 사용자는 루트(`/`)로 리다이렉트
- Task 1.2 (bypass 복원) 완료 후 실제 Supabase 인증으로 동작


## Task 1.4: Auth Integration Verification (2026-02-10)

### Verification Completed ✅

**All checks passed:**
1. AUTH BYPASS markers: 0 occurrences (fully removed)
2. Build: ✓ Compiled successfully (7.7s)
3. Lint (auth files): 0 errors, 0 warnings
4. Middleware: Redirect logic enabled (unauthenticated → /auth/login)
5. Auth helpers: Supabase integration restored
6. Role guard: STAR-only dashboard access enforced

### Key Findings

**Proxy Pattern Success:**
- `src/lib/supabase/proxy.ts` implements proper auth flow
- `getRoleFromClaims()` extracts role from JWT metadata
- `getAuthIdFromClaims()` extracts auth ID from JWT sub claim
- Unauthenticated users redirected to /auth/login
- Authenticated users at "/" redirected to role-specific dashboard

**Auth Helpers Restored:**
- `getAuthUser()` now uses Supabase auth + Prisma lookup
- Proper error handling for missing users
- Returns User | null type

**Role Guard Implementation:**
- Dashboard layout checks `user.role === "STAR"`
- Redirects non-STAR users to home
- Prevents unauthorized access to STAR-only features

**Build Quality:**
- No auth-related lint errors
- Clean compilation (53/53 static pages)
- Ready for production deployment

### Lessons Learned

1. **Proxy pattern is robust**: Centralizing auth logic in middleware reduces duplication
2. **JWT metadata extraction**: Checking both app_metadata and user_metadata provides flexibility
3. **Role-based redirects**: Middleware-level role detection enables seamless UX
4. **Supabase SSR pattern**: Proper cookie handling in middleware is critical for session persistence

### Next Steps

Wave 2 tasks:
- Expand test coverage for auth flows
- Set up CI/CD pipeline (GitHub Actions)
- Add integration tests for protected routes
- Monitor auth performance in production


## CI/CD Setup (2026-02-10)

### GitHub Actions Workflow Created
- **File**: `.github/workflows/ci.yml`
- **Triggers**: PR and push to `main` branch
- **Node version**: 22 (matches project requirement)
- **pnpm version**: 9 (explicit version for consistency)

### Pipeline Steps
1. **Checkout**: actions/checkout@v4
2. **pnpm setup**: pnpm/action-setup@v4 with version 9
3. **Node setup**: actions/setup-node@v4 with pnpm cache
4. **Dependencies**: `pnpm install --frozen-lockfile` (reproducible builds)
5. **Lint**: `pnpm lint` (ESLint)
6. **Test**: `pnpm test` (vitest run)
7. **Build**: `pnpm build` (prisma generate && next build)

### Environment Variables (Placeholder)
- `NEXT_PUBLIC_SUPABASE_URL`: https://placeholder.supabase.co
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: sb_publishable_placeholder
- `DATABASE_URL`: postgresql://placeholder:placeholder@localhost:5432/placeholder

### Notes
- YAML validated with yaml-lint (no syntax errors)
- Placeholder env vars prevent build failures in CI
- frozen-lockfile ensures reproducible dependency installation
- Cache strategy uses pnpm's built-in cache action


## [2026-02-10T16:30:00+09:00] Task 2A.1: API 라우트 테스트 12개 작성

### 결과: 14 파일, 93 테스트 전체 통과 ✅

### 작성한 테스트 파일 (12개 신규)

| 파일 | API | 테스트 수 | 케이스 |
|------|-----|-----------|--------|
| `users-me.test.ts` | GET/PATCH `/api/users/me` | 8 | 401, 404, 200, 400(JSON/Zod) |
| `admin-users.test.ts` | GET `/api/admin/users` | 5 | 401, 403, 200(페이지네이션/검색/필터) |
| `admin-users-approve.test.ts` | PATCH `/api/admin/users/[id]/approve` | 6 | 401, 403, 400(JSON/값누락), 404, 200 |
| `projects-requests.test.ts` | POST `/api/projects/requests` | 5 | 401, 403, 400(JSON/Zod), 201 |
| `projects-requests-accept.test.ts` | POST `/api/projects/requests/[id]/accept` | 6 | 401, 403, 404, 409, 201, 500 |
| `submissions.test.ts` | POST/GET `/api/submissions` | 10 | POST: 401,403,400(JSON/Zod),404,201; GET: 401,403,200,400 |
| `submissions-approve.test.ts` | PATCH `/api/submissions/[id]/approve` | 5 | 401, 403, 404, 200, 500 |
| `feedbacks.test.ts` | POST/GET `/api/feedbacks` | 11 | POST: 401,403,400(JSON/Zod),404,201; GET: 401,400,403,200(ADMIN/STAR) |
| `videos-api.test.ts` | GET `/api/videos` | 5 | 200(비인증/ADMIN/페이지네이션), 400(정렬/상태) |
| `settlements-generate.test.ts` | POST `/api/settlements/generate` | 7 | 401, 403, 400(JSON/Zod), 409, 201, 500 |
| `notifications-badge.test.ts` | GET `/api/notifications/badge` | 4 | 401, 200(STAR), 200(ADMIN), 403(미지원role) |
| `categories.test.ts` | GET `/api/categories` | 3 | 200(목록/빈목록/_count) |

### Mock 패턴 2가지

**패턴 A: `getAuthUser()` mock** (대부분의 API)
```typescript
const mockGetAuthUser = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: () => mockGetAuthUser(),
}));
```

**패턴 B: `createClient()` mock** (users/me — Supabase 직접 사용)
```typescript
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));
```

### 핵심 주의사항

1. **`users/me/route.ts`는 `getAuthUser()` 안 씀**: Supabase `createClient()` 직접 호출 → 별도 mock 필요
2. **트랜잭션 사용 API**: `$transaction` mock은 함수 자체를 mock하되, 성공 시 결과값 반환, 실패 시 에러 객체 throw
3. **Next.js 16 params**: `{ params: Promise<{ id: string }> }` — 반드시 `Promise.resolve({ id })` 형태
4. **Zod schema mock**: `vi.mock("@/lib/validations/...", async () => { const { z } = await import("zod"); ... })` 패턴으로 실제 z 사용
5. **enum mock**: `vi.mock("@/generated/prisma/client", () => ({ VideoStatus: { ... } }))` — 실제 DB enum 값 그대로 복제
6. **공개 API (videos, categories)**: `getAuthUser().catch(() => null)` 패턴 — 비인증이어도 접근 가능
7. **ESLint forEach return**: `Object.entries().forEach(([k,v]) => url.searchParams.set(k,v))` 대신 `for...of` 사용

### 테스트 전략

- 각 API에 대해 **인증 → 권한 → 입력검증 → 비즈니스로직 → 성공** 순으로 작성
- HTTP status code 기준: 401 → 403 → 400 → 404 → 200/201 → 409/500
- mock 데이터는 한국어 포함 (실제 사용 시나리오 반영)
- 트랜잭션 API는 에러 객체 throw 패턴으로 404/409 시뮬레이션

## [2026-02-10T16:40:00+09:00] Task 2A.2: 컴포넌트 테스트 8개 작성

### 결과: 8개 테스트 파일 (7개 신규 + 1개 확장), 66개 컴포넌트 테스트 전체 통과 ✅

### 작성한 테스트 파일

| 파일 | 컴포넌트 | 테스트 수 | 주요 케이스 |
|------|----------|-----------|-------------|
| `login-form.test.tsx` | LoginForm | 9 | heading, fields, links, placeholders, branding |
| `signup-form.test.tsx` | SignupForm | 9 | heading, 6 fields, links, input types |
| `request-form.test.tsx` | RequestForm | 7 | labels, placeholders, initial values, defaults |
| `request-card.test.tsx` | RequestCard | 11 | title, status badges(4), categories, budget, assignees |
| `video-card.test.tsx` | VideoCard (확장) | 16 (+6) | thumbnailUrl fallback, no category, no duration, long duration |
| `sidebar.test.tsx` | Sidebar | 9 | brand, nav items(3 groups), links, active styles |
| `feedback-form.test.tsx` | FeedbackForm | 10 | textarea, buttons, timecode capture, disable logic |
| `filter-bar.test.tsx` | FilterBar | 5 | search input, select default, URL params |

### 컴포넌트 테스트 Mock 패턴

**패턴 1: Next.js Link/Image mock** (Server + Client 컴포넌트 공통)
```typescript
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />,
}));
```

**패턴 2: next/navigation mock** (useRouter, usePathname, useSearchParams)
```typescript
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));
```

**패턴 3: sonner mock** (toast)
```typescript
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
```

**패턴 4: Supabase client mock** (auth 폼 전용)
```typescript
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: null }) },
  })),
}));
```

**패턴 5: 동적 import** (mock 등록 후 컴포넌트 import)
```typescript
const { ComponentName } = await import("@/components/domain/component-name");
```

### 핵심 주의사항

1. **중복 텍스트 주의**: heading과 button에 같은 텍스트("로그인", "회원가입") → `getByRole("heading", { name })` 사용
2. **Select 기본값**: shadcn Select는 `placeholder`가 아닌 실제 선택된 값을 렌더링 → value 기준 확인
3. **disabled 조건**: `content.trim()` 기반 disabled → userEvent.type 후 확인
4. **usePathname mock**: 변수로 선언 후 테스트별 변경, afterEach에서 리셋
5. **@testing-library/user-event 설치 필요**: `pnpm add -D @testing-library/user-event`
6. **afterEach(cleanup)**: 매 테스트 후 cleanup 필수 (React 18 호환)
7. **compact mode 테스트**: className 포함 여부로 확인 (`toContain("shrink-0")`)
8. **날짜 포맷 테스트**: ko-KR Intl 포맷은 환경마다 다를 수 있음 → 정규식 `/2026/`으로 느슨하게 확인

### 테스트 전략

- 렌더링 → 필수 요소 존재 → Props 변형 → 인터랙션(해당 시) 순서
- Server Component(request-card)는 mock 최소화, Client Component는 mock 필수
- form 컴포넌트: label/placeholder 기반 요소 탐색, input type/value 확인
- layout 컴포넌트: nav link href 확인, active class 확인

## [2026-02-10T16:45:00+09:00] Task 2A.3: 커버리지 설정

### 결과: vitest.config.ts 커버리지 설정 추가 완료 ✅

### 설정 내용

**파일**: `vitest.config.ts`

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["src/generated/**", "src/components/ui/**", "src/__tests__/**"],
}
```

### 설정 상세

| 항목 | 값 | 설명 |
|------|-----|------|
| provider | v8 | V8 엔진 기반 커버리지 (Node.js 내장) |
| reporter | text, html | 콘솔 출력 + HTML 리포트 생성 |
| include | src/**/*.{ts,tsx} | 모든 소스 파일 포함 |
| exclude | src/generated/**, src/components/ui/**, src/__tests__/** | 자동생성/UI/테스트 파일 제외 |

### 설치 과정

1. **@vitest/coverage-v8 설치**: `pnpm add -D @vitest/coverage-v8 4.0.18`
   - vitest 4.0.18과 동일 버전 설치 (호환성)
   - 10개 subdependency 추가

2. **실행 명령**: `pnpm test -- --coverage`
   - 모든 159개 테스트 통과 ✓
   - 커버리지 리포트 생성 (text + html)

### 주의사항

1. **include 패턴**: 초기 `src/app/api/**` 패턴은 커버리지 생성 안 됨 → 전체 `src/**/*.{ts,tsx}` 사용
2. **exclude 우선순위**: `src/generated/**` 제외 필수 (Prisma 자동생성 파일)
3. **outputDir 미지원**: v8 provider는 `outputDir` 속성 없음 → 기본값 `./coverage` 사용
4. **all 속성 미지원**: v8 provider는 `all: true` 속성 없음 (istanbul과 다름)

### 다음 단계

- Task 2A.4: 커버리지 임계값 설정 (lines, functions, branches, statements)
- Task 2A.5: CI/CD 파이프라인에 커버리지 리포트 통합

