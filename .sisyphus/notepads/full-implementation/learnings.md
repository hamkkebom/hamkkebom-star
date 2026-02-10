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

