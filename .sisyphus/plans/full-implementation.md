# 함께봄 스타 — 전체 구현 계획서

**생성일**: 2026-02-10  
**범위**: Auth 복원 + 테스트 확장 + CI/CD 파이프라인

---

## 배경

### 핵심 발견
- **28개 페이지 전부 구현 완료** (빈 스텁 0개)
- Auth bypass가 **버그 때문** 발생 (AI 생성 코드의 Supabase SSR 통합 문제 추정)
- Next.js 16 + Supabase SSR에서 알려진 호환성 이슈 존재 (httpOnly 쿠키, 클라이언트 세션 읽기)
- Supabase 공식 문서가 **Proxy 패턴**으로 업데이트됨 (기존 updateSession 방식 대체)

### 사용자 확인 사항
- Auth bypass 이유: 버그 (정확한 원인 불명 — AI 코드가 작동 안 함)
- DB 사용자: 실제 유저 존재 (Supabase Auth ↔ DB authId 연결됨)
- GitHub + Vercel: 둘 다 연결됨
- 테스트 범위: 핵심만 (API 10~15개 + 컴포넌트 5~8개)

---

## 작업 목록

### Wave 1: Auth 복원 (P0, 순차 처리)

- [x] **Task 1.1**: Supabase SSR + Next.js 16 호환성 조사 및 Proxy 패턴 적용
  - Supabase 공식 문서의 Next.js 16용 Proxy 패턴 조사
  - `proxy.ts` 필요 여부 + `@supabase/ssr` 0.8.0 호환성 확인
  - `src/lib/supabase/middleware.ts` 최신 패턴으로 업데이트
  - `src/lib/supabase/server.ts` Proxy 패턴 적용 (필요 시)
  - 검증: `pnpm build` + `pnpm lint` 성공
  - **병렬화**: 단독 (sequential)

- [x] **Task 1.2**: 5개 bypass 파일 복원
  - `src/middleware.ts` — bypass 제거, 원래 코드 복원
  - `src/lib/auth-helpers.ts` — bypass 제거, 원래 코드 복원
  - `src/hooks/use-auth.ts` — bypass 제거, 원래 코드 복원
  - `src/app/api/users/me/route.ts` — GET 복원, PATCH 재구성 (원본 미보존)
  - `src/components/auth/login-form.tsx` — 167~190줄 bypass UI 제거
  - **병렬화**: Task 1.3과 동시 (parallel with 1.3)

- [x] **Task 1.3**: (dashboard) 레이아웃에 STAR 역할 가드 추가
  - `src/app/(dashboard)/layout.tsx` 수정
  - `src/app/(admin)/layout.tsx` 패턴 따름: `getAuthUser()` + `user.role !== "STAR"` 체크
  - **주의**: Task 1.2와 반드시 동시 적용 (bypass 상태에서 먼저 추가 금지)
  - **병렬화**: Task 1.2와 동시 (parallel with 1.2)

- [x] **Task 1.4**: Auth 통합 검증
  - `grep -r "AUTH BYPASS" src/` → 0건
  - `pnpm build` → Exit 0
  - `pnpm lint` → Exit 0
  - 비인증 접근 차단 확인 (curl 테스트)
  - **병렬화**: 단독 (sequential, after 1.2+1.3)

---

### Wave 2: 테스트 확장 + CI/CD (P1, 병렬 처리)

#### Track A: Vitest 테스트 확장

- [x] **Task 2A.1**: API 라우트 테스트 12개 작성
  - 우선순위 API: users/me, admin/users, projects/requests, submissions, feedbacks, videos, settlements, notifications/badge, categories
  - 각 API 테스트 항목: 401 (비인증), 403 (권한 불일치), 200/201 (성공), 400 (잘못된 입력), 404 (존재하지 않음)
  - 기존 `videos.test.ts` mock 패턴 사용
  - 생성 디렉토리: `src/__tests__/api/`
  - **병렬화**: Track B와 병렬 (parallel with Track B)

- [x] **Task 2A.2**: 컴포넌트 테스트 8개 작성
  - 우선순위 컴포넌트: login-form, signup-form, request-form, request-card, video-card, sidebar, feedback-form, filter-bar
  - 기존 `video-card.test.tsx` 패턴 사용
  - 생성 디렉토리: `src/__tests__/components/`
  - **병렬화**: Track B와 병렬 (parallel with Track B)

- [x] **Task 2A.3**: 커버리지 설정
  - `vitest.config.ts`에 coverage 설정 추가: provider v8, reporter text/html, include api/components, exclude generated/ui
  - **병렬화**: Track B와 병렬 (parallel with Track B)

#### Track B: GitHub Actions CI/CD

- [x] **Task 2B.1**: CI 워크플로우 생성
  - `.github/workflows/ci.yml` 생성
  - pnpm install → lint → test → build 순서
  - placeholder env vars 설정
  - **병렬화**: Track A와 병렬 (parallel with Track A)

- [x] **Task 2B.2**: (선택) husky + lint-staged
  - `.husky/pre-commit` 생성
  - `package.json`에 lint-staged 설정 추가
  - **병렬화**: Track A와 병렬 (parallel with Track A)

---

### Wave 3: 마무리 (P2, 선택)

- [x] **Task 3.1**: 커버리지 임계값 설정
  - vitest.config.ts에 최소 커버리지 설정
  - CI에서 커버리지 리포트 업로드
  - **병렬화**: Task 3.2와 병렬 (parallel with 3.2)

- [x] **Task 3.2**: 린트/타입 체크 정리
  - 기존 경고 정리 (있을 경우)
  - tsconfig strict 설정 확인
  - **병렬화**: Task 3.1과 병렬 (parallel with 3.1)

---

## 금지 사항 (Guardrails)

1. **기존 28개 페이지 수정 금지** — 전부 구현 완료 상태
2. **새 hooks/유틸리티 파일 생성 금지** — 인라인 코드가 정상 동작 중
3. **사용되지 않는 Zod 스키마 생성 금지** — Counselor, MediaPlacement 모델용
4. **Playwright E2E 테스트 추가 금지** — vitest 단위/통합 테스트만
5. **Sentry 설정 추가 금지** — 범위 밖
6. **as any, @ts-ignore, @ts-expect-error 사용 금지**
7. **빈 catch 블록 금지**
8. **기존 테스트 삭제 금지**

---

## 상세 설계 (참고용)

<details>
<summary>Task 1.1 상세: Supabase SSR + Next.js 16 호환성 조사</summary>

**작업 내용**:
1. Supabase 공식 문서의 Next.js 16용 Proxy 패턴 조사
   - `supabase.auth.getClaims()` vs `supabase.auth.getUser()` 차이 확인
2. 현재 `src/lib/supabase/middleware.ts`를 최신 공식 패턴으로 업데이트
3. 현재 `src/lib/supabase/server.ts`에 Proxy 패턴 필요 시 적용
4. `src/lib/supabase/client.ts`는 변경 불필요 확인

**수정 파일**:
- `src/lib/supabase/middleware.ts`
- `src/lib/supabase/server.ts`
- 신규: `src/lib/supabase/proxy.ts` (공식 문서에서 권장하는 경우만)

</details>

<details>
<summary>Task 1.2 상세: 5개 bypass 파일 복원</summary>

**수정 파일 (5개)**:

1. **`src/middleware.ts`**
   - `NextResponse.next()` → `updateSession(request)` 호출
   - 원본 코드가 주석으로 완전 보존되어 있음

2. **`src/lib/auth-helpers.ts`**
   - mock ADMIN 반환 → Supabase authUser.id로 Prisma 조회
   - 원본 코드가 주석으로 완전 보존되어 있음

3. **`src/hooks/use-auth.ts`**
   - 단순 fetchUser() → Supabase onAuthStateChange 리스너
   - 원본 코드가 주석으로 완전 보존되어 있음

4. **`src/app/api/users/me/route.ts`**
   - GET: 원본 코드 부분 보존 (select 절 truncated `...`)
   - PATCH: ⚠️ **원본 인증 코드 미보존** → GET 패턴 기반으로 재구성 필요
   - PATCH 복원 패턴:
     ```typescript
     const supabase = await createClient();
     const { data: { user: authUser } } = await supabase.auth.getUser();
     if (!authUser?.id) return 401;
     // prisma.user.update({ where: { authId: authUser.id }, ... })
     ```

5. **`src/components/auth/login-form.tsx`**
   - 167~190줄의 amber bypass 버튼 블록 삭제
   - 나머지 로그인 폼 코드는 그대로 유지

</details>

<details>
<summary>Task 1.3 상세: (dashboard) 레이아웃 역할 가드</summary>

**패턴**:
```typescript
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }) {
  const user = await getAuthUser();
  if (!user || user.role !== "STAR") {
    redirect("/");
  }
  // ... 기존 레이아웃 렌더링
}
```

</details>

<details>
<summary>Task 2A.1 상세: API 라우트 테스트</summary>

**우선순위 API (12개)**:
1. `GET/PATCH /api/users/me` — 인증 핵심
2. `GET /api/admin/users` — ADMIN 권한 체크
3. `PATCH /api/admin/users/[id]/approve` — 유저 승인
4. `POST/GET /api/projects/requests` — 제작요청 CRUD
5. `POST /api/projects/requests/[id]/accept` — STAR 수락
6. `POST/GET /api/submissions` — 제출물 CRUD
7. `PATCH /api/submissions/[id]/approve` — 승인 워크플로우
8. `POST/GET /api/feedbacks` — 피드백
9. `GET /api/videos` — 영상 목록
10. `POST /api/settlements/generate` — 정산 생성
11. `GET /api/notifications/badge` — 알림 뱃지
12. `GET /api/categories` — 카테고리

**테스트 패턴**:
```typescript
vi.mock("@/lib/prisma", () => ({ prisma: { model: { findMany: vi.fn() } } }));
vi.mock("@/lib/auth-helpers", () => ({ getAuthUser: vi.fn() }));
```

</details>

<details>
<summary>Task 2A.2 상세: 컴포넌트 테스트</summary>

**우선순위 컴포넌트 (8개)**:
1. `auth/login-form.tsx`
2. `auth/signup-form.tsx`
3. `project/request-form.tsx`
4. `project/request-card.tsx`
5. `video/video-card.tsx` (기존 테스트 확장)
6. `layout/sidebar.tsx`
7. `feedback/feedback-form.tsx`
8. `project/filter-bar.tsx`

</details>

<details>
<summary>Task 2B.1 상세: CI 워크플로우</summary>

```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co"
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_placeholder"
          DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder"
```

</details>

---

## 검증 기준

| 단계 | 검증 |
|------|------|
| Auth 복원 | `grep "AUTH BYPASS" src/` → 0건, `pnpm build` 성공 |
| 테스트 | `pnpm test` 전체 통과, 커버리지 리포트 생성 |
| CI/CD | `.github/workflows/ci.yml` 존재, YAML 유효성 |
| 전체 | `pnpm lint` + `pnpm test` + `pnpm build` 모두 성공 |
