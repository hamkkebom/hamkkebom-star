# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-10
**Commit:** e5815fb
**Project:** hamkkebom-star (함께봄-스타 / 별들에게 물어봐)

## OVERVIEW

영상 제작 프리랜서(STAR)와 관리자(ADMIN)를 위한 의뢰-납품-피드백-정산 내부 플랫폼. Next.js 16 App Router 단일 배포, Supabase Auth + PostgreSQL, Prisma 7 ORM, Cloudflare Stream/R2 영상 인프라. Vercel 배포.

## STRUCTURE

```
hamkkebom-star/
├── prisma/schema.prisma          # 15 models, Supabase PG
├── prisma.config.ts              # dotenv .env.local 로딩 (Prisma 7 필수)
├── vitest.config.ts              # jsdom, globals, @/ alias, 40% coverage thresholds
├── vercel.json                   # Vercel 배포 설정
├── .github/workflows/ci.yml     # GitHub Actions: lint → test → build
├── .husky/pre-commit             # lint-staged (eslint --fix)
├── src/
│   ├── app/
│   │   ├── (dashboard)/stars/    # STAR 전용 (Sidebar+Header, role guard)
│   │   ├── (admin)/admin/        # ADMIN 전용 (AdminSidebar+Header, role guard)
│   │   ├── (videos)/             # 공개 영상 브라우저 (PublicHeader+PublicFooter)
│   │   ├── auth/                 # 공개 인증 (패스스루 레이아웃)
│   │   └── api/                  # 42개 API Route handlers → see src/app/api/AGENTS.md
│   ├── components/               # → see src/components/AGENTS.md
│   │   ├── ui/                   # shadcn/ui (auto-generated, DO NOT edit)
│   │   ├── layout/               # Sidebar, AdminSidebar, Header, PublicHeader/Footer
│   │   ├── project/              # 제작요청 (RequestCard, RequestForm, FilterBar 등)
│   │   ├── video/                # 영상 (VideoPlayer, UploadDropzone, VideoCard 등)
│   │   ├── feedback/             # 피드백 (FeedbackForm, FeedbackList)
│   │   └── auth/                 # 인증 폼 (LoginForm, SignupForm 등)
│   ├── lib/                      # → see src/lib/AGENTS.md
│   │   ├── supabase/             # client.ts, server.ts, middleware.ts, proxy.ts
│   │   ├── cloudflare/           # stream.ts (tus/signed URL), r2.ts (스토리지)
│   │   ├── validations/          # Zod schemas 7개 (auth, project-request, submission 등)
│   │   ├── prisma.ts             # PrismaClient 싱글턴 (@prisma/adapter-pg)
│   │   ├── auth-helpers.ts       # getAuthUser() — Supabase→Prisma User 조회
│   │   └── utils.ts              # cn() (clsx+twMerge)
│   ├── types/
│   │   ├── database.ts           # Prisma 타입 re-export (13 models + enums)
│   │   └── api.ts                # ApiResponse<T>, PaginatedResponse<T>, NotificationBadge
│   ├── hooks/                    # use-auth.ts, use-notifications.ts
│   ├── stores/                   # auth-store.ts (Zustand)
│   ├── __tests__/                # vitest 테스트 (21파일, 159건, 40%+ 커버리지)
│   ├── generated/prisma/         # Prisma Client output (DO NOT edit)
│   └── middleware.ts             # Supabase Proxy 패턴 → updateSession(request)
├── docs/                         # 상세 설계 문서 6개
├── SPEC.md                       # 축소 기획서 (24페이지, 42 API, 15 모델)
└── REVERSE-ENGINEERED-SPEC.md    # 원본 역설계 기획서 (49페이지, 33 모델)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Auth flow | `src/lib/supabase/proxy.ts`, `src/middleware.ts`, `src/lib/auth-helpers.ts` | Proxy 패턴: getClaims() 기반 |
| API route 추가 | `src/app/api/{domain}/route.ts` | `src/app/api/AGENTS.md` 참조 |
| DB 스키마 변경 | `prisma/schema.prisma` → `pnpm db:generate` | output → `src/generated/prisma/` |
| UI 컴포넌트 추가 | `npx shadcn@latest add {name}` | `components.json` 참조 |
| 커스텀 컴포넌트 | `src/components/{domain}/` | `src/components/AGENTS.md` 참조 |
| 페이지 추가 | `src/app/(dashboard)/stars/` 또는 `src/app/(admin)/admin/` | Route group이 레이아웃 결정 |
| Zod 검증 | `src/lib/validations/` | `src/lib/AGENTS.md` 참조 |
| 환경 변수 | `.env.local` (런타임), `.env.example` (템플릿) | `docs/03-env-example.md` 참고 |
| API 명세 | `docs/04-api-routes.md` | 전체 42개 엔드포인트 상세 |
| 컴포넌트 트리 | `docs/05-components.md` | 페이지별 UI 계층 설계 |
| 테스트 추가 | `src/__tests__/api/`, `src/__tests__/components/` | vitest, mock 패턴은 기존 파일 참고 |
| CI/CD | `.github/workflows/ci.yml` | pnpm 9, Node 22, lint→test→build |
| 배포 | `vercel.json`, `.vercel/project.json` | Vercel 자동 배포 (GitHub 연동) |

## CODE MAP

### Core Models (15)

| Model | Table | Key Relations |
|-------|-------|---------------|
| User | `users` | 중심 엔티티. role: ADMIN/STAR, baseRate, externalId |
| ProjectRequest | `project_requests` | ADMIN 생성. 상태: OPEN→FULL→CLOSED→CANCELLED |
| ProjectAssignment | `project_assignments` | STAR 수락. @@unique(starId, requestId) |
| Submission | `submissions` | 다중 버전(1~5). streamUid, r2Key, videoId 연결 |
| Feedback | `feedbacks` | 타임코드 + Fabric.js Canvas JSON, type/priority/status |
| Video | `videos` | 승인된 영상 자산. streamUid @unique, videoSubject |
| VideoTechnicalSpec | `video_technical_specs` | 1:1 Video. 코덱/해상도/비트레이트/duration |
| VideoEventLog | `video_event_logs` | 상태 변경 이력. event + fromState/toState |
| Settlement | `settlements` | 월별 정산. @@unique(starId, year, month) |
| SettlementItem | `settlement_items` | 건별 금액. baseAmount→adjustedAmount→finalAmount |
| Portfolio | `portfolios` | STAR 1:1. bio, showreel, socialLinks |
| PortfolioItem | `portfolio_items` | sortOrder drag 정렬. videoUrl |
| Category | `categories` | name+slug @unique, icon |
| Counselor | `counselors` | 상담사 프로필. externalId, counselorNo, status |
| MediaPlacement | `media_placements` | 영상 집행/매체. medium, placementType, status |

### Auth Architecture

```
Supabase SSR Proxy 패턴 (Next.js 16):
  src/middleware.ts → updateSession(request)
    ↓ src/lib/supabase/proxy.ts
    ├── createServerClient + cookies 프록시
    ├── supabase.auth.getClaims() (getUser 아님!)
    ├── getAuthIdFromClaims(claims) → authId 추출
    ├── 미인증 + /auth 이외 → /auth/login 리다이렉트
    └── 인증 + "/" → getRoleFromClaims → role별 리다이렉트
         ├── ADMIN → /admin
         └── STAR → /stars/dashboard

  API Route 내부:
    getAuthUser() → createClient() → supabase.auth.getUser()
      → prisma.user.findUnique({ where: { authId } })
      → user.role 체크로 RBAC 구현

  클라이언트:
    useAuth() hook → Supabase onAuthStateChange 리스너
      → Zustand store (fetchUser → /api/users/me)
```

### Route Groups → Layouts

| Group | Layout | Auth Guard | Components |
|-------|--------|------------|------------|
| `(dashboard)` | Sidebar + Header | `getAuthUser()` → role !== STAR → redirect | `layout/sidebar.tsx` |
| `(admin)` | AdminSidebar + Header | `getAuthUser()` → role !== ADMIN → redirect | `layout/admin-sidebar.tsx` |
| `(videos)` | PublicHeader + PublicFooter | 없음 (공개) | `layout/public-header.tsx` |
| `auth/` | 패스스루 | 없음 (공개) | `auth/auth-card-wrapper.tsx` |

### State Management

| Layer | Tool | Config |
|-------|------|--------|
| 글로벌 인증 | Zustand (`stores/auth-store.ts`) | user, isLoading, fetchUser, clearUser |
| 서버 캐싱 | TanStack Query (`providers.tsx`) | staleTime=60s, retry=1 |
| 알림 폴링 | TanStack Query (`hooks/use-notifications.ts`) | refetchInterval=60s, role별 badge |
| 폼 상태 | react-hook-form + zod | 각 컴포넌트 로컬 |
| URL 상태 | useSearchParams + useRouter | filter-bar.tsx (350ms debounce) |

## CONVENTIONS

- **패키지 매니저**: pnpm only
- **빌드 순서**: `prisma generate && next build` (package.json scripts.build)
- **Prisma client output**: `src/generated/prisma/` — 절대 수동 편집 금지
- **shadcn/ui 스타일**: `new-york`, baseColor `neutral`, `rsc: true`
- **Path alias**: `@/*` → `./src/*`
- **Supabase key 이름**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key 아님)
- **Prisma adapter**: `@prisma/adapter-pg` (PrismaPg) — native client 아님
- **DB 연결**: Supavisor 트랜잭션 모드 포트 6543, `pgbouncer=true&connection_limit=1`
- **상태 관리**: Zustand(클라이언트) + TanStack Query(서버 캐싱)
- **폼**: react-hook-form + zod + @hookform/resolvers
- **아이콘**: lucide-react
- **날짜**: date-fns, Intl.DateTimeFormat("ko-KR")
- **토스트**: sonner (toast.success/toast.error)
- **CSS**: Tailwind v4 (`@import "tailwindcss"` + `@import "tw-animate-css"` + `@import "shadcn/tailwind.css"`)
- **테마**: oklch 색상 체계, dark mode (`@custom-variant dark`), next-themes
- **언어**: 한국어 (lang="ko", 검증 메시지 한국어, 예산: `Intl.NumberFormat("ko-KR") + "원"`)
- **Server Component 기본**: `"use client"` 명시된 것만 클라이언트
- **API 응답**: `{ data, meta? }` (성공) / `{ error: { code, message } }` (실패)
- **테스트**: vitest + @testing-library/react, `src/__tests__/` 디렉토리
- **CI/CD**: GitHub Actions (lint→test with coverage→build), husky + lint-staged (pre-commit)
- **배포**: Vercel (GitHub 자동 배포), ESLint flat config (eslint.config.mjs)
- **Barrel exports 없음**: index.ts 파일 없이 직접 import

## ANTI-PATTERNS (THIS PROJECT)

- `src/generated/prisma/` 파일 수동 편집 금지 → `pnpm db:generate`로만 생성
- `src/components/ui/` 직접 편집 금지 → `npx shadcn@latest add` 사용
- Prisma native client 사용 금지 → 반드시 `@prisma/adapter-pg` (PrismaPg) 사용
- `DATABASE_URL`에 포트 5432 직접 연결 금지 → 런타임은 Supavisor 6543만 사용
- `.env.local` 커밋 금지 (`.gitignore`에 포함)
- middleware에서 `supabase.auth.getUser()` 사용 금지 → `getClaims()` 사용 (Proxy 패턴)
- API Route에서 role 체크 없이 데이터 반환 금지 → 항상 `getAuthUser()` → `user.role` 확인
- 글로벌 상태를 useState로 관리 금지 → 컴포넌트 간 공유는 Zustand
- hex/rgb 색상 사용 금지 → oklch만 사용 (globals.css 참고)
- `as any`, `@ts-ignore`, `@ts-expect-error` 사용 금지
- 빈 catch 블록 금지
- 기존 테스트 삭제 금지

## UNIQUE STYLES

- **제작요청 게시판 패턴**: ProjectRequest → ProjectAssignment → Submission → Feedback 체이닝
- **다중 버전 제출**: versionSlot(1~5) + version(v1.0, v1.1...) 2차원 버전 관리
- **정산 체계**: STAR baseRate → SettlementItem(건별) → adjustedAmount → finalAmount → Settlement(월합산)
- **Cloudflare Stream**: mock 모드 지원 (env "placeholder"이면 mock 반환), tus 프로토콜
- **Canvas 피드백**: Fabric.js 어노테이션 JSON을 Feedback.annotation에 저장
- **3단계 업로드**: (1) API→upload URL 발급 (2) Cloudflare PUT (3) API→제출 생성
- **에어테이블 마이그레이션 흔적**: externalId 필드 (PE-, SB-, VD-, CS-, PL- 접두사)
- **Supabase Proxy 패턴**: middleware에서 getClaims() 사용 (getUser 대신), role은 JWT claims에서 추출

## COMMANDS

```bash
pnpm dev              # 개발 서버 (Next.js 16 + Turbopack)
pnpm build            # prisma generate && next build
pnpm start            # 프로덕션 서버
pnpm lint             # ESLint (core-web-vitals + typescript)
pnpm test             # vitest run (159 tests, 21 files)
pnpm test:watch       # vitest watch
pnpm test -- --coverage  # 커버리지 포함 (40% thresholds)
pnpm db:generate      # Prisma Client 재생성
pnpm db:push          # 스키마 → DB 반영 (마이그레이션 없이)
pnpm db:migrate       # Prisma migrate dev
pnpm db:studio        # Prisma Studio GUI
```

## TESTING

### 구조
```
src/__tests__/
├── setup.ts                    # jsdom 환경, @testing-library/jest-dom matchers
├── api/                        # API Route 테스트 (13파일, 75건)
│   ├── users-me.test.ts
│   ├── admin-users.test.ts
│   ├── admin-users-approve.test.ts
│   ├── projects-requests.test.ts
│   ├── projects-requests-accept.test.ts
│   ├── submissions.test.ts
│   ├── submissions-approve.test.ts
│   ├── feedbacks.test.ts
│   ├── videos-api.test.ts
│   ├── settlements-generate.test.ts
│   ├── notifications-badge.test.ts
│   └── categories.test.ts
└── components/                 # 컴포넌트 테스트 (8파일, 84건)
    ├── login-form.test.tsx
    ├── signup-form.test.tsx
    ├── request-form.test.tsx
    ├── request-card.test.tsx
    ├── video-card.test.tsx
    ├── sidebar.test.tsx
    ├── feedback-form.test.tsx
    └── filter-bar.test.tsx
```

### Mock 패턴
```typescript
// API Route 테스트 — 인증 + Prisma mock
vi.mock("@/lib/prisma", () => ({ prisma: { model: { findMany: vi.fn() } } }));
vi.mock("@/lib/auth-helpers", () => ({ getAuthUser: vi.fn() }));

// 컴포넌트 테스트 — next/navigation mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/stars/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
```

### 커버리지 설정 (vitest.config.ts)
```typescript
coverage: {
  provider: "v8",
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["src/generated/**", "src/components/ui/**", "src/__tests__/**"],
  thresholds: { lines: 40, functions: 40, branches: 30, statements: 40 },
}
```

## NOTES

- **축소 프로젝트**: 원본 33모델/49페이지에서 15모델/24페이지로 축소
- **28개 페이지 전부 구현 완료**: 빈 스텁 없음, 모든 페이지 기능 동작
- **docs/ 디렉토리**: 상세 설계 문서 6개 — 구조, 스키마, 환경변수, API, 컴포넌트, 마이그레이션
- **Prisma 7 + adapter-pg**: `prisma.config.ts`에서 dotenv로 `.env.local` 수동 로딩 필수
- **배포**: Vercel + GitHub Actions CI. push/PR to main 시 자동 실행
- **Cloudflare mock**: env 미설정 시 stream/r2 mock 데이터 반환
- **Next.js 16 deprecation**: middleware → proxy 전환 경고 있음 (현재 middleware.ts로 동작)

## CHILD AGENTS.md

| Path | Scope |
|------|-------|
| `src/app/api/AGENTS.md` | API 라우트 패턴, 인증/검증/응답 템플릿, 42개 엔드포인트 맵 |
| `src/components/AGENTS.md` | 컴포넌트 패턴, 폼/쿼리/레이아웃 컨벤션 |
| `src/lib/AGENTS.md` | 코어 모듈, Supabase Proxy/Prisma/Cloudflare/Zod 패턴 |
