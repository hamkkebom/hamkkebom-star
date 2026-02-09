# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-08
**Project:** hamkkebom-star (함께봄-스타 / 별들에게 물어봐)

## OVERVIEW

영상 제작 프리랜서(STAR)와 관리자(ADMIN)를 위한 의뢰-납품-피드백-정산 내부 플랫폼. Next.js 16 App Router 단일 배포, Supabase Auth + PostgreSQL, Prisma 7 ORM, Cloudflare Stream/R2 영상 인프라.

## STRUCTURE

```
hamkkebom-star/
├── prisma/schema.prisma          # 13 models, Supabase PG
├── prisma.config.ts              # dotenv .env.local 로딩
├── src/
│   ├── app/
│   │   ├── (dashboard)/stars/    # STAR 전용 (Sidebar+Header 레이아웃)
│   │   ├── (admin)/admin/        # ADMIN 전용 (AdminSidebar+Header)
│   │   ├── (videos)/videos/      # 영상 브라우저 (Header only)
│   │   ├── auth/                 # 공개 인증 (중앙 카드 레이아웃)
│   │   └── api/                  # API Route handlers
│   ├── components/
│   │   ├── ui/                   # shadcn/ui (auto-generated, DO NOT edit)
│   │   ├── layout/               # Sidebar, AdminSidebar, Header, NotificationBadge
│   │   ├── project/              # 제작요청 관련 (RequestCard, RequestForm 등)
│   │   └── auth/                 # 인증 폼 (LoginForm, SignupForm 등)
│   ├── lib/
│   │   ├── supabase/             # client.ts (browser), server.ts (SSR), middleware.ts
│   │   ├── prisma.ts             # PrismaClient 싱글턴 (@prisma/adapter-pg)
│   │   ├── auth-helpers.ts       # getAuthUser() — Supabase→Prisma User 조회
│   │   ├── validations/          # Zod schemas (auth, project-request 등)
│   │   └── utils.ts              # cn() (clsx+twMerge)
│   ├── types/
│   │   ├── database.ts           # Prisma 타입 re-export
│   │   └── api.ts                # ApiResponse<T>, PaginatedResponse<T>
│   ├── generated/prisma/         # Prisma Client output (DO NOT edit)
│   └── middleware.ts             # Auth gate: /auth/* 제외 전체 보호
├── docs/                         # 상세 설계 문서 (구조, API, 컴포넌트, 마이그레이션)
├── SPEC.md                       # 축소 기획서 (24페이지, 40 API, 13 모델)
└── REVERSE-ENGINEERED-SPEC.md    # 원본 역설계 기획서 (49페이지, 33 모델)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Auth flow | `src/lib/supabase/`, `src/middleware.ts`, `src/lib/auth-helpers.ts` | Supabase SSR 패턴 |
| API route 추가 | `src/app/api/{domain}/route.ts` | `getAuthUser()` 호출 후 role 체크 |
| DB 스키마 변경 | `prisma/schema.prisma` → `pnpm db:generate` | output → `src/generated/prisma/` |
| UI 컴포넌트 추가 | `npx shadcn@latest add {name}` | `components.json` 참조 |
| 페이지 추가 | `src/app/(dashboard)/stars/` 또는 `src/app/(admin)/admin/` | Route group이 레이아웃 결정 |
| Zod 검증 | `src/lib/validations/` | 도메인별 분리 |
| 환경 변수 | `.env.local` (런타임), `.env.example` (템플릿) | `docs/03-env-example.md` 참고 |
| API 명세 | `docs/04-api-routes.md` | 전체 40개 엔드포인트 상세 |
| 컴포넌트 트리 | `docs/05-components.md` | 페이지별 UI 계층 설계 |
| 마이그레이션 | `docs/06-migration.md` | 에어테이블 → Supabase+CF 이전 |

## CODE MAP

### Core Models (13)

| Model | Table | Key Relations |
|-------|-------|---------------|
| User | `users` | 중심 엔티티. role: ADMIN/STAR, baseRate 포함 |
| ProjectRequest | `project_requests` | ADMIN 생성. 상태: OPEN→FULL→CLOSED |
| ProjectAssignment | `project_assignments` | STAR 수락. @@unique(starId, requestId) |
| Submission | `submissions` | 다중 버전(1~5). @@unique(assignmentId, versionSlot, version) |
| Feedback | `feedbacks` | 타임코드 + Fabric.js Canvas JSON |
| Video | `videos` | 승인된 영상 자산. streamUid @unique |
| VideoTechnicalSpec | `video_technical_specs` | 1:1 Video. 코덱/해상도/비트레이트 |
| VideoEventLog | `video_event_logs` | 상태 변경 이력 |
| Settlement | `settlements` | 월별 정산. @@unique(starId, year, month) |
| SettlementItem | `settlement_items` | 건별 금액. submissionId @unique |
| Portfolio | `portfolios` | STAR 1:1. auto findOrCreate |
| PortfolioItem | `portfolio_items` | sortOrder drag 정렬 |
| Category | `categories` | name+slug @unique |

### Auth Architecture

```
Supabase Auth (세션/토큰)
  ↓ middleware.ts
  ├── /auth/* → 통과 (공개)
  └── 그 외 → supabase.auth.getUser()
       ├── 미인증 → /auth/login 리다이렉트
       └── 인증 + "/" → role별 리다이렉트 (ADMIN→/admin, STAR→/stars/dashboard)

API Route 내부:
  getAuthUser() → Supabase authUser.id → prisma.user.findUnique({ authId })
  → user.role 체크로 RBAC 구현
```

### Route Groups → Layouts

| Group | Layout | Auth |
|-------|--------|------|
| `(dashboard)` | Sidebar + Header | STAR 전용 |
| `(admin)` | AdminSidebar + Header | ADMIN 전용 |
| `(videos)` | Header only | 로그인 필수 |
| `auth/` | 중앙 카드 + 그라데이션 | 공개 |

## CONVENTIONS

- **패키지 매니저**: pnpm only (pnpm-workspace.yaml 존재)
- **빌드 순서**: `prisma generate && next build` (package.json scripts.build)
- **Prisma client output**: `src/generated/prisma/` — 절대 수동 편집 금지
- **shadcn/ui 스타일**: `new-york`, baseColor `neutral`, `rsc: true`
- **Path alias**: `@/*` → `./src/*`
- **Supabase key 이름**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key 아님)
- **Prisma adapter**: `@prisma/adapter-pg` (PrismaPg) — native client 아님
- **DB 연결**: Supavisor 트랜잭션 모드 포트 6543, `pgbouncer=true&connection_limit=1`
- **상태 관리**: Zustand(클라이언트) + TanStack Query(서버 캐싱, staleTime=60s, retry=1)
- **폼**: react-hook-form + zod + @hookform/resolvers
- **아이콘**: lucide-react
- **날짜**: date-fns
- **토스트**: sonner
- **CSS**: Tailwind v4 (`@import "tailwindcss"` + `@import "tw-animate-css"` + `@import "shadcn/tailwind.css"`)
- **테마**: oklch 색상 체계, dark mode 지원 (`@custom-variant dark`)
- **언어**: 한국어 (lang="ko", 검증 메시지 한국어)
- **Server Component 기본**: `"use client"` 명시된 것만 클라이언트
- **API 응답 형식**: `{ data, meta? }` (성공) / `{ error: { code, message } }` (실패)

## ANTI-PATTERNS (THIS PROJECT)

- `src/generated/prisma/` 파일 수동 편집 금지 → `pnpm db:generate`로만 생성
- `src/components/ui/` 직접 편집 금지 → `npx shadcn@latest add` 사용
- Prisma native client 사용 금지 → 반드시 `@prisma/adapter-pg` (PrismaPg) 사용
- `DATABASE_URL`에 포트 5432 직접 연결 금지 → 런타임은 Supavisor 6543만 사용
- `.env.local` 커밋 금지 (`.gitignore`에 포함)
- `supabase.auth.getUser()` 앞에 코드 삽입 금지 — 세션 갱신 간섭 위험 (middleware.ts 주석 참고)
- API Route에서 role 체크 없이 데이터 반환 금지 → 항상 `getAuthUser()` → `user.role` 확인

## UNIQUE STYLES

- **제작요청 게시판 패턴**: ProjectRequest → ProjectAssignment → Submission → Feedback 체이닝
- **다중 버전 제출**: versionSlot(1~5) + version(v1.0, v1.1...) 2차원 버전 관리
- **정산 체계**: STAR baseRate(기본 단가) → SettlementItem(건별) → adjustedAmount(ADMIN 조정) → finalAmount → Settlement(월합산)
- **Cloudflare Stream signed URL**: RSA PEM 키로 서버사이드 서명, tus 프로토콜 업로드
- **Canvas 피드백**: Fabric.js 어노테이션 JSON을 Feedback.annotation에 저장
- **Auth 미들웨어 role 리다이렉트**: "/" 접근 시 metadata.role 또는 DB role 조회 후 분기

## COMMANDS

```bash
pnpm dev              # 개발 서버 (Next.js 16 + Turbopack)
pnpm build            # prisma generate && next build
pnpm start            # 프로덕션 서버
pnpm lint             # ESLint (core-web-vitals + typescript)
pnpm test             # vitest run
pnpm test:watch       # vitest watch
pnpm db:generate      # Prisma Client 재생성
pnpm db:push          # 스키마 → DB 반영 (마이그레이션 없이)
pnpm db:migrate       # Prisma migrate dev
pnpm db:studio        # Prisma Studio GUI
```

## NOTES

- **축소 프로젝트**: 원본 33모델/49페이지에서 13모델/24페이지로 축소. `REVERSE-ENGINEERED-SPEC.md`에 원본 기획 보존
- **초기 구현 단계**: 인증 + 제작요청 게시판 API/UI 구현됨. 나머지 도메인(영상, 정산, 포트폴리오 등) 페이지는 placeholder 상태
- **docs/ 디렉토리**: 상세 설계 문서 6개 — 구조, 스키마, 환경변수, API, 컴포넌트, 마이그레이션
- **`D` 파일**: 루트에 의미 불명 파일 `D` 존재 (1332 bytes) — 의도 확인 필요
- **Prisma 7 + adapter-pg**: `prisma.config.ts`에서 dotenv로 `.env.local` 수동 로딩 필수
- **Not a git repo**: 현재 git 초기화 안 됨 — 커밋 전 `git init` 필요
