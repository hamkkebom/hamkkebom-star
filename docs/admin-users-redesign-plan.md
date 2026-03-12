# 관리자 "모든 계정 관리" 페이지 리디자인 종합 계획서

**버전**: 1.0
**작성일**: 2026-03-12
**대상 파일**: `src/app/(admin)/admin/users/page.tsx`
**관련 API**: `src/app/api/admin/users/route.ts`
**상태**: 계획 수립 완료 → 구현 대기

---

## 목차

1. [현행 분석](#1-현행-분석)
2. [외부 레퍼런스 분석](#2-외부-레퍼런스-분석)
3. [디자인 시스템 정렬](#3-디자인-시스템-정렬)
4. [페이지 구조 재설계](#4-페이지-구조-재설계)
5. [통계 대시보드 섹션](#5-통계-대시보드-섹션)
6. [필터 및 검색 시스템](#6-필터-및-검색-시스템)
7. [데이터 테이블 재설계](#7-데이터-테이블-재설계)
8. [일괄 작업 시스템](#8-일괄-작업-시스템)
9. [사용자 상세 패널 재설계](#9-사용자-상세-패널-재설계)
10. [CSV 내보내기](#10-csv-내보내기)
11. [역할 필터 API 확장](#11-역할-필터-api-확장)
12. [일괄 승인/반려 API](#12-일괄-승인반려-api)
13. [모바일 반응형 전략](#13-모바일-반응형-전략)
14. [스켈레톤/로딩 상태](#14-스켈레톤로딩-상태)
15. [애니메이션 및 전환](#15-애니메이션-및-전환)
16. [접근성(A11y)](#16-접근성a11y)
17. [에러 처리 및 빈 상태](#17-에러-처리-및-빈-상태)
18. [성능 최적화](#18-성능-최적화)
19. [테스트 전략](#19-테스트-전략)
20. [구현 로드맵](#20-구현-로드맵)

---

## 1. 현행 분석

### 1.1 현재 파일 구조

```
src/app/(admin)/admin/users/page.tsx  (614줄, "use client")
├── UserRow 타입 정의
├── UsersResponse 타입 정의
├── formatDate() 유틸리티
└── AdminUsersPage 컴포넌트
    ├── 상태: search, filter, page, selectedUser, showSensitive, rejectReason
    ├── useQuery: GET /api/admin/users
    ├── useMutation: PATCH /api/admin/users/[id]/approve
    ├── UI 영역:
    │   ├── 헤더 (h1 + 설명)
    │   ├── 요약 카드 3개 (전체/대기/승인 필터)
    │   ├── 검색 Input
    │   ├── 모바일: UserSwipeDeck (대기) / 카드 리스트
    │   ├── 데스크톱: Table + 페이지네이션
    │   └── Sheet 상세 패널
    └── Sheet 내부:
        ├── 그라디언트 헤더 + 아바타
        ├── 개인정보 카드 (이메일, 전화, 주민번호)
        ├── 정산 정보 카드 (은행, 계좌)
        └── 승인/반려 버튼
```

### 1.2 현재 문제점

| 카테고리 | 문제 | 심각도 |
|----------|------|--------|
| **스타일** | 하드코딩된 색상 (`bg-white`, `dark:bg-slate-950`, `border-slate-200`) | 높음 |
| **스타일** | 테마 토큰 미사용 (`bg-card`, `border-border` 등) | 높음 |
| **스타일** | 리디자인된 reviews 페이지와 시각적 불일치 | 높음 |
| **기능** | 역할(ADMIN/STAR) 필터 없음 | 중간 |
| **기능** | 일괄 승인/반려 없음 — 한 명씩만 처리 가능 | 높음 |
| **기능** | CSV/Excel 내보내기 없음 | 중간 |
| **기능** | 사용자 통계(총 인원, 역할별, 일별 가입) 없음 | 중간 |
| **기능** | 체크박스 행 선택 없음 | 중간 |
| **UX** | 요약 카드가 실제 카운트 표시 안함 (텍스트만) | 중간 |
| **UX** | 테이블 정렬 불가 | 낮음 |
| **UX** | Sheet 상세 패널에 가입일 표시 없음 | 낮음 |
| **UX** | 검색 디바운스 없음 (입력마다 API 호출) | 중간 |

### 1.3 현재 API 능력

```
GET /api/admin/users
  Query params:
    - page (number, default 1)
    - pageSize (number, default 20, max 50)
    - search (string, name/email/chineseName 검색)
    - approved ("true" | "false" | null)
  Missing:
    - role filter (ADMIN/STAR)
    - stats endpoint (역할별/상태별 카운트)
    - bulk approve/reject
    - CSV export
```

### 1.4 현재 DB 스키마 (User 모델)

```prisma
model User {
  id                  String    @id @default(cuid())
  authId              String    @unique
  email               String    @unique
  name                String
  chineseName         String?
  phone               String?
  avatarUrl           String?
  role                Role      @default(STAR)
  isApproved          Boolean   @default(false)
  rejectionReason     String?
  baseRate            Int       @default(0)
  bankName            String?
  bankAccount         String?
  idNumber            String?
  externalId          String?   @unique
  aiToolSupportFee    Int       @default(0)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  managerId           String?
  gradeId             String?
  manager             User?     @relation("UserManager", ...)
  managedUsers        User[]    @relation("UserManager")
  grade               PricingGrade? @relation(...)
  // ... 기타 관계
}
```

---

## 2. 외부 레퍼런스 분석

### 2.1 조사 대상 및 핵심 발견

#### Supabase Dashboard — Auth Users Page
- **출처**: `supabase/supabase` GitHub (프로덕션 코드 직접 분석)
- **레이아웃**: 풀 와이드 데이터 테이블
- **컬럼**: Provider icon, Display Name (with email below), Phone, Created at, Last sign in, User UID
- **필터**: 상태 기반 탭 (All Users, Verified, Unverified, Anonymous, Banned, Over Request Limit)
- **일괄 작업**: 체크박스 선택 → 플로팅 액션 바 (Delete selected)
- **상세 패널**: 오른쪽 사이드 패널 (UserOverview) — 기본 정보, 공급자, 세션, 메타데이터
- **핵심 패턴**: `USERS_TABLE_COLUMNS` 상수로 컬럼 정의, `UserOverview` 패널 분리

#### Clerk Dashboard
- **레이아웃**: 카드형 테이블 + 강력한 검색
- **컬럼**: User avatar+name+email (복합 셀), Status, Last active, Created
- **필터**: 텍스트 검색 + 상태 드롭다운 + 정렬 옵션
- **일괄 작업**: 체크박스 → Ban, Delete
- **상세**: 전용 사용자 프로필 페이지 (별도 라우트)

#### Auth0 Dashboard
- **레이아웃**: 풀 와이드 테이블
- **컬럼**: Name+email (복합), Connection, Logins, Latest Login
- **필터**: 검색 바 + 고급 Lucene 검색 문법
- **특이사항**: 로그인 횟수/마지막 로그인 등 활동 메트릭 강조

#### WordPress Admin — Users
- **레이아웃**: 전통적 관리자 리스트 테이블
- **컬럼**: Username, Name, Email, Role, Posts
- **필터**: 역할 탭 (All, Administrator, Editor, Author, Subscriber + 각각 카운트)
- **일괄 작업**: 체크박스 → Bulk Actions 드롭다운 (Delete, Change role to…)
- **핵심 패턴**: 탭별 카운트 표시 ("All (42) | Administrator (3) | Star (39)")

#### shadcn-admin (satnaing/shadcn-admin, 6k stars)
- **레이아웃**: shadcn DataTable + 페이셋 필터
- **구현**: TanStack Table v8 + 컬럼 정의 파일 분리
- **핵심 패턴**:
  - `columns.tsx`: 컬럼 정의 (체크박스, 복합셀, 뱃지, 액션 드롭다운)
  - `cell-action.tsx`: 행별 드롭다운 메뉴
  - `data-table-toolbar.tsx`: 검색 + 페이셋 필터 + 뷰 옵션

#### tablecn (sadmann7/tablecn, 6k stars)
- **레이아웃**: 풀 기능 데이터 테이블 시스템
- **핵심 패턴**:
  - 컬럼 `meta.variant`: `"text"` → Input, `"multiSelect"` → 팝오버 필터
  - 플로팅 액션 바: 선택된 행 → 하단 고정 바에서 일괄 작업
  - URL 기반 필터 상태 (nuqs/useSearchParams)

### 2.2 패턴 종합 — 채택 결정

| 패턴 | 출처 | 채택 여부 | 이유 |
|------|------|-----------|------|
| 복합 셀 (아바타+이름+이메일) | Clerk, shadcn-admin | ✅ 채택 | 정보 밀도 향상, 컬럼 수 절감 |
| 역할 탭 필터 + 카운트 | WordPress | ✅ 채택 | 직관적, 한눈에 분포 파악 |
| 체크박스 행 선택 | Supabase, Clerk | ✅ 채택 | 일괄 작업의 전제조건 |
| 플로팅 액션 바 | tablecn | ✅ 채택 | 선택 시 하단에 일괄 작업 바 노출 |
| 오른쪽 Sheet 상세 | Supabase (기존 유지) | ✅ 유지 | 현재 구현과 일치, 스타일만 개선 |
| 페이셋 필터 팝오버 | tablecn | ❌ 미채택 | 역할/상태가 2-3개뿐, 탭이 더 직관적 |
| URL 기반 필터 상태 | tablecn | ❌ 미채택 | 현 프로젝트 패턴은 useState, 일관성 유지 |
| 별도 프로필 라우트 | Clerk | ❌ 미채택 | Sheet 패널이 현 워크플로우에 적합 |
| TanStack Table | shadcn-admin | ❌ 미채택 | 오버엔지니어링, 현재 shadcn Table로 충분 |

---

## 3. 디자인 시스템 정렬

### 3.1 테마 토큰 마이그레이션 맵

이전 3개 태스크(feedback-dashboard, reviews, reviews/my)에서 확립된 토큰 패턴을 동일하게 적용.

| 현재 (하드코딩) | 변경 후 (테마 토큰) |
|----------------|---------------------|
| `bg-white dark:bg-slate-950` | `bg-card` |
| `bg-white dark:bg-slate-900` | `bg-card` |
| `bg-slate-50 dark:bg-slate-900` | `bg-card` |
| `bg-slate-50/50 dark:bg-slate-900/50` | `bg-muted/50` |
| `border-slate-200 dark:border-slate-800` | `border-border` |
| `text-slate-900 dark:text-foreground` | `text-foreground` |
| `text-slate-800 dark:text-slate-200` | `text-foreground` |
| `text-slate-600 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-500 dark:text-slate-400` | `text-muted-foreground` |
| `text-slate-700 dark:text-slate-300` | `text-foreground` |
| `hover:bg-slate-50 dark:hover:bg-slate-800/50` | `hover:bg-muted/50` |
| `bg-slate-200 dark:bg-slate-700` | `bg-muted` |
| `bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300` | `bg-secondary text-secondary-foreground` |
| `bg-slate-800` (뱃지) | `bg-primary text-primary-foreground` |
| `bg-slate-50/20 dark:bg-slate-900/10` (빈 상태) | `bg-muted/20` |

### 3.2 색상 체계 (상태별)

모든 상태 색상은 oklch 기반 Tailwind 유틸리티만 사용 (hex/rgb 금지):

| 상태 | 배경 | 텍스트 | 예시 |
|------|------|--------|------|
| 승인됨 | `bg-emerald-500/15` | `text-emerald-600 dark:text-emerald-400` | `<Badge>승인됨</Badge>` |
| 대기중 | `bg-amber-500/15` | `text-amber-600 dark:text-amber-400` | `<Badge>대기중</Badge>` |
| 반려됨 | `bg-rose-500/15` | `text-rose-600 dark:text-rose-400` | `<Badge>반려됨</Badge>` |
| 관리자 | `bg-primary/10` | `text-primary` | `<Badge>관리자</Badge>` |
| STAR | `bg-secondary` | `text-secondary-foreground` | `<Badge>STAR</Badge>` |

### 3.3 컴포넌트 스타일 규칙

```
카드 컨테이너: bg-card border-border shadow-sm rounded-2xl
테이블 컨테이너: bg-card border-border shadow-sm rounded-2xl overflow-hidden
테이블 헤더: bg-muted/50
테이블 행 호버: hover:bg-muted/50
빈 상태: bg-muted/20 border-dashed border-border
Sheet 배경: bg-card border-border
Sheet 헤더: bg-secondary (그라디언트 제거)
검색 Input: bg-card border-border (bg-white/dark:bg-slate-950 제거)
```

---

## 4. 페이지 구조 재설계

### 4.1 신규 레이아웃 계층

```
AdminUsersPage
├── [A] 헤더 섹션
│   ├── 타이틀 + 설명 (현재 유지)
│   └── 우측: CSV 내보내기 버튼
│
├── [B] 통계 카드 행 (신규)
│   ├── 전체 사용자 수
│   ├── 관리자 수
│   ├── STAR 수
│   └── 대기중 승인 수
│
├── [C] 필터 탭 바 (재설계)
│   ├── 탭: 전체 (N) | 관리자 (N) | STAR (N) | 대기중 (N) | 승인됨 (N)
│   └── 검색 Input (우측)
│
├── [D] 데스크톱: 데이터 테이블 (재설계)
│   ├── 체크박스 | 사용자(아바타+이름+이메일) | 역할 | 상태 | 가입일 | 액션
│   └── 페이지네이션
│
├── [E] 모바일: 카드 리스트 (재설계)
│   ├── 대기 필터 시: SwipeDeck (기존 유지)
│   └── 그 외: 카드형 리스트 (테마 토큰 적용)
│
├── [F] 플로팅 일괄 작업 바 (신규)
│   └── 선택된 N명 | 일괄 승인 | 일괄 반려 | 선택 해제
│
└── [G] Sheet 상세 패널 (재설계)
    ├── 테마 토큰 적용 (그라디언트 → bg-secondary)
    ├── 가입일 정보 추가
    └── 승인/반려 UI 개선
```

### 4.2 상태 관리 변경

```typescript
// 기존
const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

// 변경
const [filter, setFilter] = useState<"all" | "ADMIN" | "STAR" | "pending" | "approved">("all");
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [debouncedSearch, setDebouncedSearch] = useState("");
// + useEffect 디바운스 (350ms)
```

### 4.3 API 쿼리 변경

```typescript
// 기존
params.set("approved", "true" | "false");

// 변경
if (filter === "ADMIN") params.set("role", "ADMIN");
if (filter === "STAR") params.set("role", "STAR");
if (filter === "pending") params.set("approved", "false");
if (filter === "approved") params.set("approved", "true");
```

---

## 5. 통계 대시보드 섹션

### 5.1 디자인

기존 3개 필터 카드 → 4개 통계 카드로 변경. 필터 기능은 탭 바로 이동.

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 👥 전체       │ │ 🛡️ 관리자    │ │ ⭐ STAR      │ │ ⏳ 승인 대기  │
│    42명       │ │    3명       │ │    35명      │ │    4명       │
│              │ │              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### 5.2 데이터 소스

통계 카운트는 별도 API 호출 없이 현재 API 응답의 `total` + 클라이언트 사이드 계산으로 구현 가능하나, 필터가 적용되면 전체 카운트를 알 수 없으므로 API 확장 필요.

**API 확장**: GET `/api/admin/users` 응답에 `stats` 필드 추가:

```typescript
{
  data: UserRow[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
  stats: {
    total: number,
    adminCount: number,
    starCount: number,
    pendingCount: number,
    approvedCount: number,
  }
}
```

### 5.3 카드 스타일

```tsx
<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
  <Card className="bg-card border-border shadow-sm">
    <CardContent className="flex items-center gap-3 p-4">
      <div className="p-2.5 bg-primary/10 rounded-xl">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">전체 사용자</p>
        <p className="text-2xl font-bold text-foreground">{stats.total}</p>
      </div>
    </CardContent>
  </Card>
  {/* ... */}
</div>
```

---

## 6. 필터 및 검색 시스템

### 6.1 필터 탭 디자인

WordPress 스타일 탭 + 카운트. reviews 페이지의 탭 패턴 참조.

```tsx
<div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
  {[
    { key: "all", label: "전체", count: stats.total },
    { key: "ADMIN", label: "관리자", count: stats.adminCount },
    { key: "STAR", label: "STAR", count: stats.starCount },
    { key: "pending", label: "대기중", count: stats.pendingCount },
    { key: "approved", label: "승인됨", count: stats.approvedCount },
  ].map(tab => (
    <button
      key={tab.key}
      onClick={() => handleFilterChange(tab.key)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
        filter === tab.key
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
      <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
    </button>
  ))}
</div>
```

### 6.2 검색 디바운스

현재 문제: 매 키 입력마다 API 호출. 해결: 350ms 디바운스.

```typescript
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
    setPage(1);
  }, 350);
  return () => clearTimeout(timer);
}, [search]);

// queryKey에 debouncedSearch 사용
const queryKey = ["admin-users", debouncedSearch, filter, page, pageSize];
```

### 6.3 검색+필터 통합 UI

```
┌─────────────────────────────────────────────────────────┐
│ [전체(42)] [관리자(3)] [STAR(35)] [대기중(4)] [승인됨(38)]│
│                                                         │
│                              🔍 이름 또는 이메일 검색... │
└─────────────────────────────────────────────────────────┘
```

탭과 검색을 같은 행에 배치. 모바일에서는 탭이 수평 스크롤, 검색은 아래 행.

---

## 7. 데이터 테이블 재설계

### 7.1 컬럼 구조 변경

| 기존 | 변경 |
|------|------|
| 이름(한글) | ✅ 체크박스 |
| 이름(중문) | 👤 사용자 (아바타 + 이름 + 이메일 복합셀) |
| 이메일 | 🏷️ 역할 (뱃지) |
| 역할 | 📊 상태 (뱃지) |
| 상태 | 📅 가입일 |
| 가입일 | ⋯ 액션 (드롭다운) |

### 7.2 복합 사용자 셀

```tsx
<div className="flex items-center gap-3">
  <Avatar className="h-8 w-8 border border-border">
    <AvatarImage src={user.avatarUrl || ""} />
    <AvatarFallback className="text-xs bg-muted text-muted-foreground">
      {user.name.slice(0, 2)}
    </AvatarFallback>
  </Avatar>
  <div className="flex flex-col min-w-0">
    <span className="font-medium text-sm text-foreground truncate">{user.name}</span>
    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
  </div>
</div>
```

### 7.3 체크박스 선택

```tsx
// 전체 선택
<Checkbox
  checked={selectedIds.size === rows.length && rows.length > 0}
  onCheckedChange={(checked) => {
    if (checked) {
      setSelectedIds(new Set(rows.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  }}
/>

// 행별 선택
<Checkbox
  checked={selectedIds.has(row.id)}
  onCheckedChange={(checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }}
/>
```

### 7.4 행 액션 드롭다운 (신규)

기존에는 행 클릭 → Sheet 상세만 가능. 변경: 우측 `⋯` 버튼으로 빠른 액션.

```
⋯ 클릭 →
  ├── 👁️ 상세 보기
  ├── ────────────
  ├── ✅ 승인 (미승인 시)
  ├── ⛔ 승인 취소 (승인 시)
  └── ────────────
```

### 7.5 테이블 스타일

```
bg-card border-border shadow-sm rounded-2xl overflow-hidden
├── TableHeader: bg-muted/50
│   └── TableHead: text-muted-foreground font-semibold text-xs uppercase
├── TableBody:
│   └── TableRow: hover:bg-muted/50 transition-colors cursor-pointer
└── Pagination: border-t border-border bg-card
```

---

## 8. 일괄 작업 시스템

### 8.1 플로팅 액션 바

체크박스로 1명 이상 선택 시 화면 하단에 고정 바 표시.

```tsx
<AnimatePresence>
  {selectedIds.size > 0 && (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        bg-card border border-border shadow-lg rounded-2xl
        px-6 py-3 flex items-center gap-4"
    >
      <span className="text-sm font-medium text-foreground">
        {selectedIds.size}명 선택됨
      </span>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" onClick={handleBulkApprove}
        className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <CheckCircle2 className="h-4 w-4 mr-1.5" /> 일괄 승인
      </Button>
      <Button size="sm" variant="outline" onClick={handleBulkReject}
        className="border-rose-200 text-rose-600 hover:bg-rose-50">
        <XCircle className="h-4 w-4 mr-1.5" /> 일괄 반려
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
        선택 해제
      </Button>
    </motion.div>
  )}
</AnimatePresence>
```

### 8.2 일괄 작업 확인 다이얼로그

일괄 승인/반려 클릭 시 확인 다이얼로그 표시 (실수 방지):

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{selectedIds.size}명을 일괄 승인하시겠습니까?</DialogTitle>
      <DialogDescription>
        선택된 모든 사용자의 계정이 승인됩니다. 이 작업은 되돌릴 수 있습니다.
      </DialogDescription>
    </DialogHeader>
    <div className="flex gap-2 justify-end">
      <Button variant="outline" onClick={close}>취소</Button>
      <Button onClick={confirmBulkApprove}>승인 실행</Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## 9. 사용자 상세 패널 재설계

### 9.1 헤더 변경

기존 그라디언트 (`from-indigo-500 via-purple-500 to-pink-500`) 제거.
`bg-secondary` 통일.

```tsx
<div className="relative h-28 bg-secondary p-6 flex items-end" />
```

### 9.2 정보 카드 스타일 통일

```
기존: bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
변경: bg-card border-border
섹션 헤더: bg-muted/50 border-b border-border
아이콘 배경: bg-primary/10, bg-emerald-500/10, etc. (유지 — 의미적 색상)
레이블: text-muted-foreground text-xs font-medium
값: text-foreground text-sm font-medium
```

### 9.3 가입일 정보 추가

Sheet 상세 패널의 개인정보 카드에 가입일 필드 추가:

```tsx
<div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
    <Calendar className="w-4 h-4 text-primary" />
  </div>
  <div>
    <p className="text-xs font-medium text-muted-foreground">가입일</p>
    <p className="text-sm font-medium text-foreground">{formatDate(selectedUser.createdAt)}</p>
  </div>
</div>
```

### 9.4 액션 버튼 스타일

```
승인 버튼: bg-emerald-600 hover:bg-emerald-700 text-white (text-foreground → text-white 교정)
반려 버튼: border-border text-rose-600 hover:bg-rose-500/10
텍스트영역: bg-card border-border focus:ring-ring
```

---

## 10. CSV 내보내기

### 10.1 클라이언트 사이드 구현

서버 API 없이 현재 표시된 데이터를 CSV로 변환. 전체 데이터가 필요하면 pageSize=50으로 모든 페이지 fetch.

간단한 구현 (현재 페이지 데이터만):

```typescript
function exportToCSV(rows: UserRow[]) {
  const headers = ["이름", "이메일", "역할", "상태", "가입일"];
  const csvRows = [
    headers.join(","),
    ...rows.map(r => [
      r.name,
      r.email,
      r.role === "ADMIN" ? "관리자" : "STAR",
      r.isApproved ? "승인됨" : "대기중",
      formatDate(r.createdAt),
    ].map(v => `"${v}"`).join(","))
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `사용자목록_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 10.2 UI

헤더 우측에 다운로드 버튼:

```tsx
<Button variant="outline" size="sm" onClick={() => exportToCSV(rows)}>
  <Download className="h-4 w-4 mr-1.5" /> CSV 내보내기
</Button>
```

---

## 11. 역할 필터 API 확장

### 11.1 변경 사항

**파일**: `src/app/api/admin/users/route.ts`

추가 query param: `role` ("ADMIN" | "STAR" | null)

```typescript
const roleFilter = searchParams.get("role"); // "ADMIN" | "STAR" | null

if (roleFilter === "ADMIN" || roleFilter === "STAR") {
  where.role = roleFilter;
}
```

### 11.2 통계 필드 추가

응답에 `stats` 객체 추가 (필터 무관하게 항상 전체 카운트 반환):

```typescript
const [rows, total, stats] = await Promise.all([
  prisma.user.findMany({ where, ... }),
  prisma.user.count({ where }),
  prisma.user.groupBy({
    by: ["role", "isApproved"],
    _count: { id: true },
  }),
]);

// stats 계산
const statsMap = { total: 0, adminCount: 0, starCount: 0, pendingCount: 0, approvedCount: 0 };
for (const g of stats) {
  const count = g._count.id;
  statsMap.total += count;
  if (g.role === "ADMIN") statsMap.adminCount += count;
  if (g.role === "STAR") statsMap.starCount += count;
  if (g.isApproved) statsMap.approvedCount += count;
  else statsMap.pendingCount += count;
}
```

---

## 12. 일괄 승인/반려 API

### 12.1 엔드포인트

**경로**: `POST /api/admin/users/bulk-approve`

```typescript
// Request body (Zod schema):
{
  userIds: string[],       // 1~50개
  approved: boolean,
  rejectionReason?: string  // approved=false일 때만
}
```

### 12.2 구현

```typescript
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || user.role !== "ADMIN") return 401/403;

  const body = await request.json();
  const parsed = bulkApproveSchema.safeParse(body);
  if (!parsed.success) return 400;

  const { userIds, approved, rejectionReason } = parsed.data;

  const result = await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: {
      isApproved: approved,
      rejectionReason: approved ? null : (rejectionReason || null),
    },
  });

  return NextResponse.json({ data: { updated: result.count } });
}
```

### 12.3 Zod 스키마

**파일**: `src/lib/validations/admin-user.ts` (신규)

```typescript
import { z } from "zod";

export const bulkApproveSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1, "최소 1명을 선택해야 합니다.").max(50, "한 번에 최대 50명까지 처리할 수 있습니다."),
  approved: z.boolean(),
  rejectionReason: z.string().max(500, "반려 사유는 500자 이내로 입력해주세요.").optional(),
});
```

---

## 13. 모바일 반응형 전략

### 13.1 레이아웃 분기점

| 뷰포트 | 레이아웃 | 세부 |
|---------|----------|------|
| `< md (768px)` | 카드 리스트 / SwipeDeck | 체크박스 → 롱프레스 선택, 탭 수평 스크롤 |
| `≥ md` | 데이터 테이블 | 풀 기능 |

### 13.2 모바일 통계 카드

```
2x2 그리드 (grid-cols-2) → lg에서 4열 (lg:grid-cols-4)
```

### 13.3 모바일 필터 탭

```tsx
<div className="overflow-x-auto no-scrollbar -mx-4 px-4">
  <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-max">
    {/* 탭들 */}
  </div>
</div>
```

### 13.4 모바일 카드 스타일

기존 하드코딩 → 테마 토큰:

```
bg-white dark:bg-slate-900 → bg-card
border-slate-200 dark:border-slate-800 → border-border
text-slate-900 dark:text-foreground → text-foreground
bg-slate-200 dark:bg-slate-700 (아바타 fallback) → bg-muted
```

---

## 14. 스켈레톤/로딩 상태

### 14.1 통계 카드 스켈레톤

```tsx
<div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
  {[1,2,3,4].map(i => (
    <Card key={i} className="bg-card border-border">
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### 14.2 테이블 스켈레톤

```tsx
{[1,2,3,4,5].map(i => (
  <TableRow key={i}>
    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
    <TableCell>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </TableCell>
    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
  </TableRow>
))}
```

---

## 15. 애니메이션 및 전환

### 15.1 Framer Motion 사용처

| 요소 | 애니메이션 | 설정 |
|------|-----------|------|
| 플로팅 액션 바 | 아래에서 슬라이드 업 | `initial={{ y: 100 }} animate={{ y: 0 }}` |
| 통계 카드 숫자 | 카운트 업 (미적용, 과잉) | — |
| 필터 탭 변경 | 없음 (즉각 전환) | — |
| 테이블 행 | `hover:bg-muted/50 transition-colors` | CSS only |
| Sheet 패널 | shadcn Sheet 기본 애니메이션 | 유지 |

### 15.2 트랜지션 클래스

```
transition-all duration-200 — 카드 호버, 버튼 상태
transition-colors — 테이블 행 호버
active:scale-[0.98] — 모바일 터치 피드백
```

---

## 16. 접근성(A11y)

### 16.1 체크리스트

- [ ] 체크박스: `aria-label="전체 선택"` / `aria-label="{이름} 선택"`
- [ ] 테이블: 의미론적 `<Table>` 구조 유지 (shadcn 기본)
- [ ] 탭 필터: `role="tablist"` + `role="tab"` + `aria-selected`
- [ ] Sheet: `SheetTitle` + `SheetDescription` 필수 (shadcn 기본)
- [ ] 키보드: Tab으로 체크박스/버튼 탐색 가능
- [ ] 포커스: `focus-visible:ring-2 focus-visible:ring-ring` (shadcn 기본)
- [ ] 색상 대비: 모든 텍스트 WCAG AA 이상

---

## 17. 에러 처리 및 빈 상태

### 17.1 빈 상태

```tsx
<TableRow>
  <TableCell colSpan={6} className="h-48">
    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="p-3 bg-muted/50 rounded-full">
        <Users className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">
          {search ? "검색 결과가 없습니다" : "가입한 사용자가 없습니다"}
        </p>
        <p className="text-sm mt-1">
          {search ? "다른 검색어를 시도해 보세요." : "새로운 사용자가 가입하면 여기에 표시됩니다."}
        </p>
      </div>
    </div>
  </TableCell>
</TableRow>
```

### 17.2 에러 상태

```tsx
if (error) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="font-medium">사용자 목록을 불러오지 못했습니다</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        다시 시도
      </Button>
    </div>
  );
}
```

---

## 18. 성능 최적화

### 18.1 검색 디바운스
- 350ms 디바운스 (기존 filter-bar.tsx 패턴과 동일)
- 디바운스 중 시각적 피드백 없음 (충분히 빠름)

### 18.2 쿼리 캐싱
- TanStack Query staleTime=60s (providers.tsx 전역 설정 유지)
- 필터 변경 시 새 queryKey → 자동 리페치
- 승인/반려 후 `invalidateQueries(["admin-users"])` → 모든 관련 쿼리 무효화

### 18.3 체크박스 Set 성능
- `Set<string>` 사용 — O(1) 추가/삭제/조회
- 페이지 변경 시 선택 초기화 (다른 페이지 데이터는 선택 불가)

---

## 19. 테스트 전략

### 19.1 변경 범위

1. **API 테스트 수정**: `src/__tests__/api/admin-users.test.ts` (있으면)
   - 새 `role` 쿼리 파라미터 테스트 추가
   - `stats` 응답 필드 테스트 추가
   - 일괄 승인 엔드포인트 테스트 (새 파일)

2. **컴포넌트 테스트**: 기존 컴포넌트 테스트 패턴 유지
   - 필터 탭 클릭 → queryKey 변경 확인
   - 체크박스 선택 → selectedIds 상태 확인
   - 플로팅 바 표시/숨김 확인

### 19.2 기존 테스트 영향도

- 현재 `admin-users.test.ts` 파일 없음 → 새 테스트만 추가
- 기존 테스트 수정 없음

---

## 20. 구현 로드맵

### Phase 1: API 확장 (30분)
1. `src/app/api/admin/users/route.ts` — role 필터 + stats 응답 추가
2. `src/lib/validations/admin-user.ts` — bulkApproveSchema 생성
3. `src/app/api/admin/users/bulk-approve/route.ts` — 일괄 승인 API

### Phase 2: 페이지 재설계 (2시간)
1. 타입 확장 (UsersResponse에 stats 추가)
2. 통계 카드 섹션 구현
3. 필터 탭 바 구현 (역할+상태 탭)
4. 검색 디바운스 구현
5. 테이블 재설계 (체크박스, 복합셀, 액션 드롭다운)
6. 플로팅 일괄 작업 바 구현
7. Sheet 상세 패널 테마 토큰 적용
8. 모바일 뷰 테마 토큰 적용
9. CSV 내보내기 함수 추가
10. 스켈레톤/빈 상태/에러 상태

### Phase 3: 검증 (15분)
1. LSP diagnostics 확인
2. `pnpm build` 통과 확인
3. 기존 테스트 통과 확인

### 예상 변경 파일

| 파일 | 작업 | LOC 변경 |
|------|------|----------|
| `src/app/api/admin/users/route.ts` | 수정 (role 필터 + stats) | +30 |
| `src/lib/validations/admin-user.ts` | 신규 | +15 |
| `src/app/api/admin/users/bulk-approve/route.ts` | 신규 | +50 |
| `src/app/(admin)/admin/users/page.tsx` | 전면 재설계 | ~800 (기존 614 → 800~900) |

**총 예상 변경**: ~900 LOC (신규 + 수정)

---

## 부록 A: 전체 파일 의존성 맵

```
page.tsx imports:
  ├── react: useState, useEffect, useCallback
  ├── @tanstack/react-query: useQuery, useMutation, useQueryClient
  ├── @/components/ui/*: Card, Table, Button, Input, Badge, Dialog, Sheet, Avatar, Checkbox, Skeleton
  ├── sonner: toast
  ├── lucide-react: CheckCircle2, XCircle, Search, Users, ChevronLeft/Right, Mail, Phone, CreditCard, ShieldCheck, Eye, EyeOff, Building, Download, MoreHorizontal, Calendar, AlertCircle
  ├── framer-motion: motion, AnimatePresence
  ├── @/lib/settlement-utils: maskIdNumber
  ├── @/lib/utils: cn
  └── @/components/admin/user-swipe-deck: UserSwipeDeck, SwipeableUser
```

## 부록 B: 기존 API 응답 vs 신규 API 응답

```typescript
// 기존
{
  data: UserRow[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
}

// 신규
{
  data: UserRow[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
  stats: {
    total: number,
    adminCount: number,
    starCount: number,
    pendingCount: number,
    approvedCount: number,
  }
}
```

---

**계획서 끝. 구현을 시작합니다.**
