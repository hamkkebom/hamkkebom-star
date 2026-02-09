# 프로젝트 구조

> Next.js 15 App Router 단일 앱 구조. 별도 백엔드 없음.

## 검증된 의존성 버전

| 패키지 | 버전 | 비고 |
|--------|------|------|
| next | 16.1.6 | App Router, React 19 지원 |
| react / react-dom | 19.2.4 | Next.js 16 peer dependency 충족 |
| @tailwindcss/postcss | 4.1.18 | Tailwind CSS v4 |
| prisma / @prisma/client | 7.3.0 | Supabase Supavisor 호환 |
| @prisma/adapter-pg | 7.3.0 | Prisma + Supabase driver adapter |
| @supabase/supabase-js | 2.95.3 | @supabase/ssr peer dependency >=2.76.1 충족 |
| @supabase/ssr | 0.8.0 | Next.js App Router SSR 지원 |
| @tanstack/react-query | 5.90.20 | React 19 peer dependency 충족 |
| zustand | 5.0.11 | React >=18 peer dependency 충족 |
| react-hook-form | 7.71.1 | React 19 peer dependency 충족 |
| zod | 4.3.6 | 스키마 검증 |
| fabric | 7.1.0 | Canvas 마킹 (peer dependency 없음, 독립) |
| hls.js | 1.6.15 | HLS 스트리밍 (peer dependency 없음) |
| plyr | 3.8.4 | 영상 플레이어 |
| plyr-react | 6.0.0 | plyr >=3.7.7, react >=16.8 충족 |
| @sentry/nextjs | 10.38.0 | Next.js >=13.2.0 peer dependency 충족 |
| vitest | 4.0.18 | 유닛 테스트 |
| lucide-react | 0.563.0 | 아이콘 (shadcn/ui 기본) |
| date-fns | 4.1.0 | 날짜 포맷 |
| pnpm | 9.x | 패키지 매니저 |

### 호환성 검증 완료

- next@16.1.6 → react `^18.2.0 || ^19.0.0` ✅ (react@19.2.4)
- @supabase/ssr@0.8.0 → @supabase/supabase-js `^2.76.1` ✅ (2.95.3)
- @sentry/nextjs@10.38.0 → next `^13.2.0 || ^14.0 || ^15.0.0-rc.0 || ^16.0.0-0` ✅ (16.1.6)
- @tanstack/react-query@5.90.20 → react `^18 || ^19` ✅
- zustand@5.0.11 → react `>=18.0.0` ✅
- react-hook-form@7.71.1 → react `^16.8.0 || ^17 || ^18 || ^19` ✅
- plyr-react@6.0.0 → plyr `^3.7.7` ✅, react `>=16.8` ✅
- fabric@7.1.0 → peer dependency 없음 ✅
- hls.js@1.6.15 → peer dependency 없음 ✅

---

## 폴더 구조

```
hamkkebom-star/
├── .env.local                          # 환경 변수 (git 제외)
├── .env.example                        # 환경 변수 템플릿
├── next.config.ts                      # Next.js 설정
├── postcss.config.mjs                  # PostCSS (Tailwind v4)
├── tsconfig.json                       # TypeScript 설정
├── package.json
├── pnpm-lock.yaml
│
├── prisma/
│   ├── schema.prisma                   # DB 스키마 (13개 모델)
│   └── migrations/                     # 마이그레이션 히스토리
│
├── public/
│   ├── favicon.ico
│   └── images/                         # 정적 이미지
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # 루트 레이아웃
│   │   ├── not-found.tsx               # 404 페이지
│   │   │
│   │   ├── (auth)/                     # 인증 라우트 그룹
│   │   │   ├── layout.tsx              # 인증 레이아웃 (중앙 카드 + 그라데이션)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── reset-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/                # STAR 대시보드 라우트 그룹
│   │   │   ├── layout.tsx              # Sidebar + Header + 알림 뱃지
│   │   │   └── stars/
│   │   │       ├── dashboard/
│   │   │       │   └── page.tsx        # STAR 대시보드
│   │   │       ├── project-board/
│   │   │       │   └── page.tsx        # 제작요청 게시판
│   │   │       ├── request-detail/
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx    # 요청 상세
│   │   │       ├── my-videos/
│   │   │       │   └── page.tsx        # 내 영상 관리
│   │   │       ├── upload/
│   │   │       │   └── page.tsx        # 영상 업로드
│   │   │       ├── feedback/
│   │   │       │   └── page.tsx        # 피드백 확인
│   │   │       ├── earnings/
│   │   │       │   └── page.tsx        # 정산 내역
│   │   │       ├── portfolio/
│   │   │       │   └── page.tsx        # 포트폴리오
│   │   │       ├── profile/
│   │   │       │   └── page.tsx        # 프로필
│   │   │       └── settings/
│   │   │           └── page.tsx        # 설정
│   │   │
│   │   ├── (admin)/                    # ADMIN 라우트 그룹
│   │   │   ├── layout.tsx              # AdminSidebar + Header + 알림 뱃지
│   │   │   └── admin/
│   │   │       ├── page.tsx            # ADMIN 대시보드
│   │   │       ├── requests/
│   │   │       │   └── page.tsx        # 제작요청 관리
│   │   │       ├── reviews/
│   │   │       │   ├── page.tsx        # 제출 영상 목록
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx    # 영상 상세 + 피드백 작성
│   │   │       ├── videos/
│   │   │       │   └── page.tsx        # 전체 영상 관리
│   │   │       ├── stars/
│   │   │       │   ├── page.tsx        # STAR 회원 목록
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx    # STAR 상세 (단가 설정)
│   │   │       └── settlements/
│   │   │           └── page.tsx        # 정산 관리
│   │   │
│   │   ├── (videos)/                   # 영상 브라우저 라우트 그룹
│   │   │   ├── layout.tsx              # Header + 알림 뱃지
│   │   │   └── videos/
│   │   │       ├── page.tsx            # 영상 목록
│   │   │       └── [id]/
│   │   │           └── page.tsx        # 영상 상세
│   │   │
│   │   └── api/                        # API Routes
│   │       ├── projects/
│   │       │   ├── requests/
│   │       │   │   ├── board/
│   │       │   │   │   └── route.ts    # GET 게시판 목록
│   │       │   │   ├── [id]/
│   │       │   │   │   ├── route.ts    # GET 상세, PATCH 수정, DELETE 삭제
│   │       │   │   │   └── accept/
│   │       │   │   │       └── route.ts # POST 수락
│   │       │   │   └── route.ts        # POST 생성
│   │       │   └── my-assignments/
│   │       │       └── route.ts        # GET 내 수락 내역
│   │       │
│   │       ├── submissions/
│   │       │   ├── upload-url/
│   │       │   │   └── route.ts        # POST 업로드 URL 발급
│   │       │   ├── my/
│   │       │   │   └── route.ts        # GET 내 제출물
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts        # GET, PATCH 제출물
│   │       │   │   ├── approve/
│   │       │   │   │   └── route.ts    # PATCH 승인
│   │       │   │   └── reject/
│   │       │   │       └── route.ts    # PATCH 반려
│   │       │   └── route.ts            # GET 전체, POST 생성
│   │       │
│   │       ├── feedback/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts        # GET, PATCH, DELETE
│   │       │   └── route.ts            # GET 목록, POST 생성
│   │       │
│   │       ├── videos/
│   │       │   ├── upload-url/
│   │       │   │   └── route.ts        # POST tus URL 발급
│   │       │   ├── search/
│   │       │   │   └── route.ts        # GET 검색
│   │       │   ├── sync/
│   │       │   │   └── route.ts        # POST Stream 동기화
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts        # GET 상세, PATCH 수정
│   │       │   │   ├── preview/
│   │       │   │   │   └── route.ts    # GET signed URL
│   │       │   │   └── replace/
│   │       │   │       └── route.ts    # POST 파일 교체
│   │       │   └── route.ts            # GET 목록
│   │       │
│   │       ├── settlements/
│   │       │   ├── generate/
│   │       │   │   └── route.ts        # POST 월별 생성
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts        # GET 상세
│   │       │   │   ├── complete/
│   │       │   │   │   └── route.ts    # PATCH 확정
│   │       │   │   └── items/
│   │       │   │       └── [itemId]/
│   │       │   │           └── route.ts # PATCH 금액 조정
│   │       │   └── route.ts            # GET 목록
│   │       │
│   │       ├── portfolios/
│   │       │   ├── me/
│   │       │   │   ├── route.ts        # GET, PATCH 내 포트폴리오
│   │       │   │   └── items/
│   │       │   │       ├── reorder/
│   │       │   │       │   └── route.ts # PATCH 순서 변경
│   │       │   │       ├── [itemId]/
│   │       │   │       │   └── route.ts # PATCH, DELETE 항목
│   │       │   │       └── route.ts    # POST 항목 추가
│   │       │   └── user/
│   │       │       └── [userId]/
│   │       │           └── route.ts    # GET 특정 유저 포트폴리오
│   │       │
│   │       ├── users/
│   │       │   └── me/
│   │       │       └── route.ts        # GET, PATCH 내 정보
│   │       │
│   │       ├── admin/
│   │       │   └── stars/
│   │       │       ├── [id]/
│   │       │       │   └── route.ts    # GET, PATCH STAR 상세
│   │       │       └── route.ts        # GET STAR 목록
│   │       │
│   │       ├── notifications/
│   │       │   └── badge/
│   │       │       └── route.ts        # GET 알림 뱃지 카운트
│   │       │
│   │       └── health/
│   │           └── route.ts            # GET 헬스체크
│   │
│   ├── lib/                            # 유틸리티 & 설정
│   │   ├── supabase/
│   │   │   ├── client.ts               # 브라우저 Supabase 클라이언트
│   │   │   ├── server.ts               # 서버 Supabase 클라이언트
│   │   │   └── middleware.ts           # 미들웨어용 세션 업데이트
│   │   ├── prisma.ts                   # Prisma 클라이언트 싱글턴
│   │   ├── cloudflare/
│   │   │   ├── stream.ts              # Cloudflare Stream API 헬퍼
│   │   │   └── r2.ts                  # Cloudflare R2 헬퍼
│   │   ├── validations/               # Zod 스키마
│   │   │   ├── auth.ts
│   │   │   ├── project-request.ts
│   │   │   ├── submission.ts
│   │   │   ├── feedback.ts
│   │   │   ├── video.ts
│   │   │   ├── settlement.ts
│   │   │   ├── portfolio.ts
│   │   │   └── user.ts
│   │   └── utils.ts                   # cn() 등 공통 유틸
│   │
│   ├── components/                     # 재사용 컴포넌트
│   │   ├── ui/                        # shadcn/ui 컴포넌트 (자동 생성)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (필요시 추가)
│   │   │
│   │   ├── layout/                    # 레이아웃 컴포넌트
│   │   │   ├── sidebar.tsx            # STAR 사이드바
│   │   │   ├── admin-sidebar.tsx      # ADMIN 사이드바
│   │   │   ├── header.tsx             # 공통 헤더
│   │   │   └── notification-badge.tsx # 알림 뱃지
│   │   │
│   │   ├── video/                     # 영상 관련
│   │   │   ├── video-player.tsx       # Plyr + HLS.js 플레이어
│   │   │   ├── video-card.tsx         # 영상 카드
│   │   │   ├── video-grid.tsx         # 영상 그리드
│   │   │   ├── video-upload.tsx       # tus 업로드 컴포넌트
│   │   │   └── video-editor.tsx       # 메타데이터 편집 폼
│   │   │
│   │   ├── feedback/                  # 피드백 관련
│   │   │   ├── feedback-panel.tsx     # 피드백 목록/작성 패널
│   │   │   └── annotation-canvas.tsx  # Fabric.js Canvas 마킹
│   │   │
│   │   ├── project/                   # 제작요청 관련
│   │   │   ├── request-card.tsx       # 요청 카드
│   │   │   ├── request-list.tsx       # 요청 목록
│   │   │   └── request-form.tsx       # 요청 생성/수정 폼
│   │   │
│   │   ├── settlement/                # 정산 관련
│   │   │   ├── settlement-table.tsx   # 정산 테이블
│   │   │   └── settlement-detail.tsx  # 정산 상세 (아이템 목록)
│   │   │
│   │   ├── portfolio/                 # 포트폴리오 관련
│   │   │   ├── portfolio-card.tsx
│   │   │   ├── portfolio-grid.tsx
│   │   │   └── portfolio-editor.tsx   # 편집 모달
│   │   │
│   │   └── dashboard/                 # 대시보드 관련
│   │       ├── stat-card.tsx          # 통계 카드
│   │       └── activity-feed.tsx      # 최근 활동
│   │
│   ├── hooks/                         # 커스텀 훅
│   │   ├── use-auth.ts               # Supabase 인증 상태
│   │   ├── use-notifications.ts      # 알림 뱃지 폴링
│   │   └── use-video-upload.ts       # tus 업로드 훅
│   │
│   ├── stores/                        # Zustand 스토어
│   │   └── auth-store.ts             # 인증 사용자 상태
│   │
│   ├── types/                         # TypeScript 타입
│   │   ├── database.ts               # Prisma 생성 타입 re-export
│   │   └── api.ts                    # API 요청/응답 타입
│   │
│   └── middleware.ts                  # Next.js 미들웨어 (인증 체크)
│
├── scripts/                           # 운영 스크립트
│   └── migrate-airtable.ts           # 에어테이블 마이그레이션
│
└── tests/                             # 테스트
    ├── setup.ts                       # Vitest 설정
    └── unit/                          # 유닛 테스트
        ├── lib/
        └── components/
```

## 라우트 그룹 → 레이아웃 매핑

| 라우트 그룹 | 레이아웃 | 미들웨어 |
|-------------|---------|----------|
| `(auth)` | 중앙 카드 + 그라데이션 배경 | 인증 불필요 (미들웨어 제외) |
| `(dashboard)` | Sidebar + Header + 알림 뱃지 | 인증 필수 + STAR 역할 |
| `(admin)` | AdminSidebar + Header + 알림 뱃지 | 인증 필수 + ADMIN 역할 |
| `(videos)` | Header + 알림 뱃지 | 인증 필수 |

## 미들웨어 라우트 매칭

```typescript
// src/middleware.ts
export const config = {
  matcher: [
    // auth 경로와 정적 파일 제외, 나머지 전체 보호
    '/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```
