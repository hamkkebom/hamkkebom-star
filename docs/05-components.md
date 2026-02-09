# 컴포넌트 설계 (페이지별 UI 트리)

> shadcn/ui 기반. Tailwind CSS v4. 컴포넌트 = Server Component 기본, `"use client"` 명시된 것만 클라이언트.

---

## 공통 레이아웃 컴포넌트

### `(auth)` 레이아웃

```
AuthLayout
├── GradientBackground           # 그라데이션 배경
└── CenteredCard                 # 중앙 카드 컨테이너
    └── {children}
```

### `(dashboard)` 레이아웃

```
DashboardLayout
├── Sidebar                      # "use client" — STAR 네비게이션
│   ├── Logo
│   ├── NavItem (대시보드)
│   ├── NavItem (제작요청)
│   ├── NavItem (내 영상)
│   ├── NavItem (업로드)
│   ├── NavItem (피드백)
│   ├── NavItem (정산)
│   ├── NavItem (포트폴리오)
│   └── NavItem (프로필/설정)
├── Header
│   ├── BreadcrumbNav
│   ├── NotificationBadge        # "use client" — 폴링
│   └── UserMenu (아바타 + 드롭다운)
└── MainContent
    └── {children}
```

### `(admin)` 레이아웃

```
AdminLayout
├── AdminSidebar                 # "use client"
│   ├── Logo
│   ├── NavItem (대시보드)
│   ├── NavItem (제작요청)
│   ├── NavItem (제출 영상)
│   ├── NavItem (영상 관리)
│   ├── NavItem (STAR 관리)
│   └── NavItem (정산)
├── Header
│   ├── BreadcrumbNav
│   ├── NotificationBadge        # "use client"
│   └── UserMenu
└── MainContent
    └── {children}
```

### `(videos)` 레이아웃

```
VideosLayout
├── Header
│   ├── Logo
│   ├── SearchInput              # "use client"
│   ├── NotificationBadge        # "use client"
│   └── UserMenu
└── MainContent
    └── {children}
```

---

## 인증 페이지 (4페이지)

### `/auth/login`

```
LoginPage
└── LoginForm                    # "use client"
    ├── Input (이메일)
    ├── Input (비밀번호)
    ├── Button (로그인)
    └── Link (비밀번호 찾기 / 회원가입)
```

### `/auth/signup`

```
SignupPage
└── SignupForm                   # "use client"
    ├── Input (이름)
    ├── Input (이메일)
    ├── Input (전화번호)
    ├── Input (비밀번호)
    ├── Input (비밀번호 확인)
    └── Button (가입)
```

### `/auth/forgot-password`

```
ForgotPasswordPage
└── ForgotPasswordForm           # "use client"
    ├── Input (이메일)
    └── Button (리셋 링크 발송)
```

### `/auth/reset-password`

```
ResetPasswordPage
└── ResetPasswordForm            # "use client"
    ├── Input (새 비밀번호)
    ├── Input (비밀번호 확인)
    └── Button (변경)
```

---

## STAR 페이지 (10페이지)

### `/stars/dashboard`

```
StarDashboardPage
├── PageHeader ("대시보드")
├── StatCardGrid                 # 4열 그리드
│   ├── StatCard (진행중 프로젝트)
│   ├── StatCard (미확인 피드백)   # 강조 색상
│   ├── StatCard (이번 달 제출)
│   └── StatCard (최근 정산 금액)
└── ActivityFeed                 # "use client"
    └── ActivityItem[]           # 최근 제출/피드백/승인 타임라인
```

### `/stars/project-board`

```
ProjectBoardPage
├── PageHeader ("제작요청 게시판")
├── FilterBar                    # "use client"
│   ├── Select (상태: 전체/OPEN/FULL)
│   ├── SearchInput
│   └── Select (정렬: 최신/마감임박)
└── RequestList                  # "use client" — TanStack Query
    └── RequestCard[]
        ├── Badge (상태)
        ├── Title
        ├── CategoryTags
        ├── Deadline
        ├── Budget
        └── AssigneeCount (현재/최대)
```

### `/stars/request-detail/[id]`

```
RequestDetailPage (Server Component — 데이터 fetch)
├── BackButton
├── RequestHeader
│   ├── Title
│   ├── Badge (상태)
│   └── Button (수락) / Badge (이미 수락)
├── RequestInfo
│   ├── 마감일
│   ├── 예산
│   ├── 수락 현황 (N/M명)
│   └── 카테고리 태그
├── Requirements                 # 제작 가이드라인
├── ReferenceUrls                # 참고 URL 목록
└── MySubmissions                # "use client" — 내 제출물 목록 (수락한 경우)
    └── SubmissionCard[]
```

### `/stars/my-videos`

```
MyVideosPage
├── PageHeader ("내 영상")
└── VideoGrid                    # "use client" — TanStack Query
    └── VideoCard[]
        ├── Thumbnail
        ├── Title
        ├── Status Badge
        └── DropdownMenu (수정 / 파일 교체)
            ├── MenuItem → Dialog (VideoEditor)
            └── MenuItem → Dialog (FileReplace)
```

### `/stars/upload`

```
UploadPage
├── PageHeader ("영상 업로드")
└── UploadForm                   # "use client"
    ├── Select (수락한 요청 선택)
    ├── Select (버전 슬롯 1~5)
    ├── Input (버전 타이틀)
    ├── VideoUpload               # tus 업로드
    │   ├── DropZone
    │   └── ProgressBar
    └── Button (제출)
```

### `/stars/feedback`

```
FeedbackPage
├── PageHeader ("피드백")
├── FilterBar                    # "use client"
│   ├── Select (제출물 선택)
│   └── Select (상태: 전체/PENDING/RESOLVED)
└── FeedbackList                 # "use client"
    └── FeedbackItem[]
        ├── Badge (유형: 자막/BGM/컷편집)
        ├── Badge (우선순위)
        ├── TimecodeRange (00:15 ~ 00:20)
        ├── Content
        └── AnnotationPreview     # Canvas 마킹 미리보기 (read-only)
```

### `/stars/earnings`

```
EarningsPage
├── PageHeader ("정산 내역")
├── EarningsSummary
│   ├── StatCard (이번 달)
│   └── StatCard (누적)
└── SettlementTable              # "use client" — DataTable
    ├── Column (연월)
    ├── Column (건수)
    ├── Column (합계)
    ├── Column (상태 Badge)
    └── RowAction → Dialog (SettlementDetail)
```

### `/stars/portfolio`

```
PortfolioPage
├── PageHeader ("포트폴리오")
├── ProfileEditor                # "use client"
│   ├── Textarea (bio)
│   ├── Input (showreel URL)
│   ├── Input (website)
│   └── SocialLinksEditor
├── Button (항목 추가) → Dialog (PortfolioEditor)
└── PortfolioGrid                # "use client" — drag & drop reorder
    └── PortfolioCard[]
        ├── Thumbnail
        ├── Title
        └── DropdownMenu (수정 / 삭제)
```

### `/stars/profile`

```
ProfilePage
├── PageHeader ("프로필")
└── ProfileForm                  # "use client"
    ├── AvatarUpload
    ├── Input (이름)
    ├── Input (이메일) — readonly
    ├── Input (전화번호)
    └── Button (저장)
```

### `/stars/settings`

```
SettingsPage
├── PageHeader ("설정")
└── PasswordChangeForm           # "use client"
    ├── Input (새 비밀번호)
    ├── Input (비밀번호 확인)
    └── Button (변경)
```

---

## ADMIN 페이지 (8페이지)

### `/admin` (대시보드)

```
AdminDashboardPage
├── PageHeader ("관리자 대시보드")
├── StatCardGrid
│   ├── StatCard (전체 영상 수)
│   ├── StatCard (활성 제작요청)
│   ├── StatCard (미확인 영상)     # 강조 — 제출됐지만 리뷰 안 한 건
│   ├── StatCard (미처리 정산)
│   └── StatCard (활동중 STAR 수)
└── RecentActivity
    └── ActivityItem[] (최근 제출/승인/정산 타임라인)
```

### `/admin/requests`

```
AdminRequestsPage
├── PageHeader ("제작요청 관리")
├── Button (새 요청 생성) → Dialog (RequestForm)
├── FilterBar
│   ├── Select (상태)
│   └── SearchInput
└── DataTable                    # "use client"
    ├── Column (제목)
    ├── Column (상태 Badge)
    ├── Column (마감일)
    ├── Column (수락 현황)
    └── RowAction (수정 / 삭제)
```

### `/admin/reviews`

```
AdminReviewsPage
├── PageHeader ("제출 영상 조회")
├── FilterBar
│   ├── Select (상태: PENDING/IN_REVIEW/APPROVED)
│   ├── Select (STAR 필터)
│   └── SearchInput
└── SubmissionGrid               # "use client"
    └── SubmissionCard[]
        ├── Thumbnail (영상 프리뷰)
        ├── STAR 이름
        ├── 요청 제목
        ├── 버전 슬롯 + 타이틀
        ├── Status Badge
        └── Link → /admin/reviews/[id]
```

### `/admin/reviews/[id]`

```
AdminReviewDetailPage
├── BackButton
├── SubmissionHeader
│   ├── STAR 정보
│   ├── 요청 정보
│   ├── 버전 슬롯 / 타이틀
│   └── ActionButtons (승인 / 반려)
├── VideoPlayerSection           # "use client"
│   ├── VideoPlayer (Plyr + HLS.js)
│   └── AnnotationCanvas         # "use client" — Fabric.js
│       ├── ToolBar (펜/도형/텍스트/지우기)
│       └── Canvas
├── FeedbackPanel                # "use client"
│   ├── FeedbackList (기존 피드백)
│   └── FeedbackForm
│       ├── Select (유형: 자막/BGM/컷편집/색보정)
│       ├── Select (우선순위)
│       ├── TimecodeInput (startTime ~ endTime)
│       ├── Textarea (내용)
│       ├── Button (현재 마킹 캡처)
│       └── Button (피드백 저장)
└── SubmissionHistory             # 이전 버전 목록
```

### `/admin/videos`

```
AdminVideosPage
├── PageHeader ("영상 관리")
├── FilterBar
│   ├── Select (카테고리)
│   ├── Select (상태)
│   ├── SearchInput
│   └── Button (Stream 동기화)
└── DataTable                    # "use client"
    ├── Column (썸네일)
    ├── Column (제목)
    ├── Column (크리에이터)
    ├── Column (카테고리)
    ├── Column (상태 Badge)
    └── RowAction (수정 / 파일 교체)
        ├── Dialog (VideoEditor)
        └── Dialog (FileReplace)
```

### `/admin/stars`

```
AdminStarsPage
├── PageHeader ("STAR 관리")
├── SearchInput
└── DataTable                    # "use client"
    ├── Column (아바타 + 이름)
    ├── Column (이메일)
    ├── Column (기본 단가)
    ├── Column (프로젝트 수)
    └── RowAction → Link /admin/stars/[id]
```

### `/admin/stars/[id]`

```
AdminStarDetailPage
├── BackButton
├── StarProfile
│   ├── Avatar
│   ├── 이름, 이메일, 전화번호
│   └── BaseRateEditor           # "use client" — 인라인 수정
│       ├── Input (기본 단가)
│       └── Button (저장)
├── Tabs                         # "use client"
│   ├── Tab (프로젝트 이력)
│   │   └── AssignmentTable
│   ├── Tab (정산 내역)
│   │   └── SettlementTable
│   └── Tab (포트폴리오)
│       └── PortfolioGrid (read-only)
```

### `/admin/settlements`

```
AdminSettlementsPage
├── PageHeader ("정산 관리")
├── GenerateButton               # "use client"
│   ├── Select (연도)
│   ├── Select (월)
│   └── Button (정산 생성)
├── FilterBar
│   ├── Select (연도)
│   ├── Select (월)
│   └── Select (상태)
└── DataTable                    # "use client"
    ├── Column (STAR 이름)
    ├── Column (연월)
    ├── Column (건수)
    ├── Column (합계 금액)
    ├── Column (상태 Badge)
    └── RowAction
        ├── Dialog (SettlementDetail — 건별 조정)
        └── Button (확정)
```

---

## 영상 브라우저 페이지 (2페이지)

### `/videos`

```
VideoBrowserPage
├── FilterBar                    # "use client"
│   ├── Select (카테고리)
│   ├── Select (크리에이터)
│   ├── Select (정렬: 최신/인기)
│   └── SearchInput
└── VideoGrid                    # "use client" — TanStack Query + 무한 스크롤
    └── VideoCard[]
        ├── Thumbnail (hover → 프리뷰)
        ├── Title
        ├── Creator
        ├── Duration
        └── Link → /videos/[id]
```

### `/videos/[id]`

```
VideoDetailPage (Server Component — 데이터 fetch)
├── VideoPlayerSection           # "use client"
│   └── VideoPlayer (Plyr + HLS.js — signed URL)
├── VideoMeta
│   ├── Title
│   ├── Creator
│   ├── Category Badge
│   ├── CreatedAt
│   └── Description
└── TechnicalSpec                # 접이식 패널
    ├── 해상도
    ├── 코덱
    ├── 비트레이트
    └── 파일 크기
```

---

## 공통 재사용 컴포넌트

| 컴포넌트 | 위치 | 유형 | 설명 |
|----------|------|------|------|
| `VideoPlayer` | `components/video/` | client | Plyr + HLS.js 래퍼 |
| `VideoCard` | `components/video/` | client | 썸네일 + 메타 카드 |
| `VideoGrid` | `components/video/` | client | 반응형 그리드 + 무한 스크롤 |
| `VideoUpload` | `components/video/` | client | tus 업로드 + 진행률 |
| `VideoEditor` | `components/video/` | client | 메타데이터 수정 Dialog |
| `FeedbackPanel` | `components/feedback/` | client | 피드백 목록 + 작성 |
| `AnnotationCanvas` | `components/feedback/` | client | Fabric.js Canvas |
| `RequestCard` | `components/project/` | server | 요청 카드 |
| `RequestForm` | `components/project/` | client | 요청 생성/수정 폼 |
| `SettlementTable` | `components/settlement/` | client | DataTable |
| `SettlementDetail` | `components/settlement/` | client | 건별 금액 Dialog |
| `PortfolioCard` | `components/portfolio/` | server | 작품 카드 |
| `PortfolioGrid` | `components/portfolio/` | client | drag 정렬 그리드 |
| `PortfolioEditor` | `components/portfolio/` | client | 항목 편집 Dialog |
| `StatCard` | `components/dashboard/` | server | 통계 카드 |
| `ActivityFeed` | `components/dashboard/` | client | 활동 타임라인 |
| `NotificationBadge` | `components/layout/` | client | 알림 뱃지 (폴링) |
| `Sidebar` | `components/layout/` | client | STAR 사이드바 |
| `AdminSidebar` | `components/layout/` | client | ADMIN 사이드바 |
| `Header` | `components/layout/` | server | 공통 헤더 |

### shadcn/ui 사용 컴포넌트 목록

```
button, card, dialog, table, form, input, textarea,
badge, select, tabs, dropdown-menu, avatar, skeleton,
toast (sonner), separator, sheet, tooltip, popover,
command (검색), progress
```
