# 함께봄-스타 축소 기획서

> **문서 목적**: 역설계 기획서(REVERSE-ENGINEERED-SPEC.md) 기반, 핵심 기능만 남긴 축소 기획서.
>
> **작성일**: 2026-02-07

---

## 1. 제품 개요

### 1.1 제품명
**함께봄-스타** (별들에게 물어봐)

### 1.2 한 줄 요약
영상 제작 프리랜서(STAR)와 관리자(ADMIN)를 위한 영상 제작 의뢰-납품-정산 내부 플랫폼.

### 1.3 핵심 흐름

```
[ADMIN] 제작요청 등록
       ↓
[STAR] 게시판에서 수락
       ↓
[STAR] 영상 제작 → 업로드 (최대 5버전)
       ↓
[ADMIN] 제출 영상 조회 → 피드백 (타임코드 + Canvas 마킹)
       ↓
[STAR] 수정 → 재제출 (반복)
       ↓
[ADMIN] 최종 승인
       ↓
승인된 영상 → STAR 기본 단가 적용 → (ADMIN 건별 조정) → 월말 합산 정산
       ↓
영상 브라우저에 등록 → 내부 열람
```

---

## 2. 사용자 역할

### 2.1 역할 정의

| 역할 | 코드 | 설명 |
|------|------|------|
| **관리자** | `ADMIN` | 전체 시스템 관리. 제작요청 생성, 피드백, 정산, 회원 관리 |
| **프리랜서** | `STAR` | 영상 제작자. 요청 수락, 영상 업로드/수정, 정산 조회, 포트폴리오 |

### 2.2 권한 매트릭스

| 기능 | ADMIN | STAR | 비로그인 |
|------|:-----:|:----:|:--------:|
| 로그인/가입 페이지 | - | - | O |
| 대시보드 | O | O | - |
| 제작요청 생성 | O | - | - |
| 제작요청 게시판 열람 | O | O | - |
| 제작요청 수락 | - | O | - |
| 영상 업로드 | O | O | - |
| 영상 메타데이터 수정 | 전체 | 본인만 | - |
| 영상 파일 교체 | 전체 | 본인만 | - |
| 영상 브라우저 | O | O | - |
| 피드백 작성 | O | - | - |
| 피드백 조회 | O | 본인만 | - |
| 정산 생성/조정 | O | - | - |
| 정산 조회 | 전체 | 본인만 | - |
| STAR 회원 관리 | O | - | - |
| STAR 기본 단가 설정 | O | - | - |
| 포트폴리오 관리 | O | 본인만 | - |
| 프로필/설정 | O | O | - |

### 2.3 인증 체계

```
Supabase Auth (인증) + Next.js Middleware (라우트 보호)
  ├─ /auth/* → 미들웨어 통과 (유일한 공개 경로)
  └─ 그 외 전체 → 미들웨어에서 세션 체크 (미인증 시 /auth/login 리다이렉트)
       └─ ADMIN 전용 기능 → 서버 액션/API Route에서 role 체크
```

---

## 3. 기능 명세

### 3.1 인증 (Auth)

**Supabase Auth** 기반. 자체 JWT 구현 없이 Supabase가 세션/토큰 관리.

| 기능 | 구현 | 설명 |
|------|------|------|
| 로그인 | `supabase.auth.signInWithPassword()` | 이메일 + 비밀번호 |
| 회원가입 | `supabase.auth.signUp()` | STAR 셀프 가입 (metadata에 role 저장) |
| 토큰 갱신 | Supabase 자동 처리 | refresh_token 자동 갱신 |
| 로그아웃 | `supabase.auth.signOut()` | 세션 폐기 |
| 비밀번호 리셋 | `supabase.auth.resetPasswordForEmail()` | Supabase 내장 이메일 발송 |

**페이지**:
- `/auth/login` — 로그인 (유일한 공개 랜딩)
- `/auth/signup` — STAR 회원가입
- `/auth/forgot-password` — 비밀번호 찾기
- `/auth/reset-password` — 비밀번호 재설정

---

### 3.2 제작요청 & 매칭

#### 3.2.1 제작요청 (ProjectRequest)

ADMIN이 생성하여 STAR에게 영상 제작을 의뢰하는 게시판.

| 필드 | 타입 | 설명 |
|------|------|------|
| title | string | 요청 제목 |
| categories | string[] | 분류 태그 |
| deadline | DateTime | 마감일 |
| assignmentType | SINGLE/MULTIPLE | 독점(1명) / 중복(여러 명) |
| maxAssignees | int (기본 3) | 최대 수락 인원 |
| estimatedBudget | Decimal | 예상 예산 (참고용) |
| requirements | string | 제작 가이드라인 |
| referenceUrls | string[] | 참고 URL |

**상태 흐름**:
```
OPEN → FULL (정원 도달) → CLOSED (마감)
  └→ CANCELLED (취소)
```

#### 3.2.2 수락 (ProjectAssignment)

| 상태 | 설명 |
|------|------|
| ACCEPTED | 수락됨 |
| IN_PROGRESS | 제작 진행중 |
| SUBMITTED | 제출 완료 |
| COMPLETED | 최종 완료 |
| CANCELLED | 취소 |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/projects/requests/board` | ADMIN, STAR |
| POST | `/projects/requests` | ADMIN |
| GET | `/projects/requests/:id` | ADMIN, STAR |
| POST | `/projects/requests/:id/accept` | STAR |
| GET | `/projects/my-assignments` | STAR |
| PATCH | `/projects/requests/:id` | ADMIN |
| DELETE | `/projects/requests/:id` | ADMIN |

**페이지**:
- `/stars/project-board` — 제작요청 게시판
- `/stars/request-detail/[id]` — 요청 상세
- `/admin/requests` — 요청 관리 (ADMIN)

---

### 3.3 영상 제출 & 피드백

#### 3.3.1 제출물 (Submission)

STAR가 제작한 영상을 업로드하는 다중 버전 시스템.

| 핵심 기능 | 설명 |
|-----------|------|
| 다중 버전 (1~5) | versionSlot(1~5)로 최대 5개 버전 동시 관리 |
| 버전 타이틀 | "경쾌한 톤", "차분한 톤" 등 설명 |
| 자동 리비전 | version 필드로 v1.0, v1.1... 추적 |
| Cloudflare Stream | tus 프로토콜 업로드 → signed URL 재생 |

**상태**: `PENDING` → `IN_REVIEW` → `APPROVED` / `REJECTED` / `REVISED`

**API**:
| Method | Path | 권한 |
|--------|------|------|
| POST | `/submissions/upload-url` | STAR |
| POST | `/submissions` | STAR |
| GET | `/submissions/my` | STAR (본인) |
| GET | `/submissions` | ADMIN (전체, projectId 필터) |
| GET | `/submissions/:id` | ADMIN, STAR (본인) |
| PATCH | `/submissions/:id` | ADMIN, STAR (본인) |
| PATCH | `/submissions/:id/approve` | ADMIN |
| PATCH | `/submissions/:id/reject` | ADMIN |

**페이지**:
- `/stars/upload` — 영상 업로드
- `/stars/feedback` — 내 피드백 확인
- `/admin/reviews` — 제출 영상 조회 (ADMIN)
- `/admin/reviews/[id]` — 제출 영상 상세 + 피드백 작성

#### 3.3.2 피드백 (Feedback)

타임코드 기반 영상 피드백 + Canvas 마킹.

| 핵심 기능 | 설명 |
|-----------|------|
| 타임코드 범위 | startTime ~ endTime (초 단위 구간) |
| 피드백 유형 | 자막 / BGM / 컷편집 / 색보정 |
| 우선순위 | LOW / NORMAL / HIGH / URGENT |
| Canvas 마킹 | Fabric.js 기반 화면 어노테이션 (JSON 저장) |

**상태**: `PENDING` → `RESOLVED` / `WONTFIX`

**API**:
| Method | Path | 권한 |
|--------|------|------|
| POST | `/feedback` | ADMIN |
| GET | `/feedback?submissionId=` | ADMIN, STAR (본인 제출물) |
| GET | `/feedback/:id` | ADMIN, STAR (본인 제출물) |
| PATCH | `/feedback/:id` | ADMIN (작성자 본인) |
| DELETE | `/feedback/:id` | ADMIN (작성자 본인) |

---

### 3.4 영상 관리 & 브라우저

#### 3.4.1 영상 (Video)

승인된 영상의 자산 관리. 유튜브 스타일 메타데이터 편집 + 파일 교체 지원.

**데이터 모델**:
```
Video (영상)
  ├─ title, description          — 메타데이터
  ├─ category                    — 분류
  ├─ thumbnailUrl                — 썸네일 (AVIF/WebP)
  ├─ VideoTechnicalSpec          — 기술 스펙 (해상도, 코덱, 비트레이트 등)
  └─ VideoEventLog               — 상태 변경 이력
```

**영상 상태**: `DRAFT` → `PENDING` → `APPROVED` → `FINAL`

**영상 편집 기능**:
| 기능 | STAR | ADMIN |
|------|------|-------|
| 메타데이터 수정 (제목, 설명, 카테고리, 썸네일) | 본인만 | 전체 |
| 영상 파일 교체 | 본인만 | 전체 |

#### 3.4.2 영상 브라우저

로그인 필수. 내부 영상 탐색 시스템.

| 기능 | 설명 |
|------|------|
| 필터링 | 카테고리, 크리에이터, 정렬(최신/인기) |
| 검색 | 키워드 기반 텍스트 검색 (PostgreSQL full-text search) |
| 스트리밍 | Plyr + HLS.js, Cloudflare Stream signed URL |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/videos` | ADMIN, STAR |
| GET | `/api/videos/:id` | ADMIN, STAR |
| GET | `/api/videos/:id/preview` | ADMIN, STAR |
| GET | `/api/videos/search?q=` | ADMIN, STAR |
| PATCH | `/api/videos/:id` | ADMIN(전체), STAR(본인) |
| POST | `/api/videos/:id/replace` | ADMIN(전체), STAR(본인) |
| POST | `/api/videos/upload-url` | ADMIN, STAR |
| POST | `/api/videos/sync` | ADMIN |

**페이지**:
- `/videos` — 영상 브라우저
- `/videos/[id]` — 영상 상세
- `/stars/my-videos` — 내 영상 관리 (메타데이터 수정, 파일 교체)
- `/admin/videos` — 전체 영상 관리

---

### 3.5 정산

#### 3.5.1 정산 구조

단일 정산 체계. 월별 합산.

| 항목 | 설명 |
|------|------|
| **기준** | 피드백 통과(승인)된 영상만 대상 |
| **기본 금액** | STAR 개인 기본 단가 (ADMIN이 프로필에서 설정) |
| **조정** | ADMIN이 건별로 금액 조정 가능 |
| **주기** | 월별 합산 |

#### 3.5.2 정산 흐름

```
영상 승인 (APPROVED)
    ↓
STAR 기본 단가 자동 적용
    ↓
(ADMIN 건별 금액 조정 - 선택)
    ↓
월말: 해당 월 승인 건 합산
    ↓
정산 생성 → PROCESSING → COMPLETED
```

#### 3.5.3 STAR 기본 단가

STAR User 모델에 추가:

| 필드 | 타입 | 설명 |
|------|------|------|
| baseRate | Decimal | 영상 1건당 기본 단가 |

ADMIN이 STAR 회원 관리 페이지에서 설정/수정.

#### 3.5.4 정산 데이터

| 필드 | 타입 | 설명 |
|------|------|------|
| starId | FK → User | 대상 STAR |
| month | int (1~12) | 정산 월 |
| year | int | 정산 연도 |
| totalAmount | Decimal | 월 합산 금액 |
| status | enum | PENDING → PROCESSING → COMPLETED / FAILED |
| items[] | 관계 | 개별 승인 영상 + 적용 금액 목록 |

**정산 아이템 (SettlementItem)**:

| 필드 | 타입 | 설명 |
|------|------|------|
| settlementId | FK → Settlement | 소속 정산 |
| submissionId | FK → Submission | 승인된 제출물 |
| baseAmount | Decimal | STAR 기본 단가 |
| adjustedAmount | Decimal | ADMIN 조정 금액 (null이면 기본 단가 적용) |
| finalAmount | Decimal | 최종 적용 금액 |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| POST | `/settlements/generate` | ADMIN (월별 자동 생성) |
| GET | `/settlements` | ADMIN(전체), STAR(본인) |
| GET | `/settlements/:id` | ADMIN, STAR(본인) |
| PATCH | `/settlements/:id/items/:itemId` | ADMIN (건별 금액 조정) |
| PATCH | `/settlements/:id/complete` | ADMIN (정산 확정) |

**페이지**:
- `/stars/earnings` — 내 정산 내역
- `/admin/settlements` — 정산 관리 (월별 생성, 조정, 확정)

---

### 3.6 포트폴리오

STAR 개인 포트폴리오 관리.

| 기능 | 설명 |
|------|------|
| 프로필 | bio, showreel, website, socialLinks |
| 아이템 관리 | CRUD + 순서 변경 (drag & reorder) |
| 내 포트폴리오 | auto findOrCreate |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/portfolios/me` | STAR |
| PATCH | `/portfolios/me` | STAR |
| POST | `/portfolios/me/items` | STAR |
| PATCH | `/portfolios/me/items/:itemId` | STAR |
| DELETE | `/portfolios/me/items/:itemId` | STAR |
| PATCH | `/portfolios/me/items/reorder` | STAR |
| GET | `/portfolios/user/:userId` | ADMIN |

**페이지**: `/stars/portfolio`

---

### 3.7 대시보드

#### 3.7.1 STAR 대시보드

| 항목 | 설명 |
|------|------|
| 진행중 프로젝트 수 | IN_PROGRESS 상태 assignment 건수 |
| 미확인 피드백 | PENDING 상태 피드백 건수 (알림 뱃지 연동) |
| 최근 정산 요약 | 직전 월 정산 금액 + 상태 |
| 최근 활동 | 최근 제출/피드백/승인 타임라인 |

**페이지**: `/stars/dashboard`

#### 3.7.2 ADMIN 대시보드

| 항목 | 설명 |
|------|------|
| 전체 영상 수 | 등록된 영상 총 건수 |
| 활성 제작요청 | OPEN 상태 요청 건수 |
| 미확인 영상 | 제출됐지만 리뷰 안 한 영상 건수 (알림 뱃지 연동) |
| 미처리 정산 | PENDING 상태 정산 건수 |
| STAR 현황 | 총 회원 수, 활동중 STAR 수 |

**페이지**: `/admin`

---

### 3.8 알림 뱃지 (비실시간)

Socket.io 없이, 페이지 로드 시 서버 조회.

| 대상 | 뱃지 내용 |
|------|-----------|
| STAR | 미확인 피드백 건수 |
| ADMIN | 미확인 영상(제출물) 건수 + 미처리 정산 건수 |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/notifications/badge` | ADMIN, STAR |

**구현**: 헤더 컴포넌트에서 페이지 전환 시 폴링. 별도 Notification 모델 불필요 — 기존 Submission/Settlement 상태에서 count 쿼리.

---

### 3.9 STAR 회원 관리 (ADMIN)

| 기능 | 설명 |
|------|------|
| 목록 조회 | 전체 STAR 목록 (검색, 필터) |
| 상세 조회 | STAR 프로필 + 기본 단가 + 프로젝트 이력 |
| 기본 단가 설정 | baseRate 수정 |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/admin/stars` | ADMIN |
| GET | `/admin/stars/:id` | ADMIN |
| PATCH | `/admin/stars/:id` | ADMIN (단가 설정 등) |

**페이지**:
- `/admin/stars` — STAR 목록
- `/admin/stars/[id]` — STAR 상세 (단가 설정 포함)

---

### 3.10 프로필 & 설정

| 기능 | 설명 |
|------|------|
| 프로필 수정 | 이름, 연락처, 프로필 이미지 |
| 비밀번호 변경 | 현재 비밀번호 확인 후 변경 |

**API**:
| Method | Path | 권한 |
|--------|------|------|
| GET | `/users/me` | ADMIN, STAR |
| PATCH | `/users/me` | ADMIN, STAR |
| PATCH | `/users/me/password` | ADMIN, STAR |

**페이지**:
- `/stars/profile` — 프로필
- `/stars/settings` — 설정 (비밀번호 변경)

---

## 4. 화면 구조 (Sitemap)

### 4.1 전체 페이지 맵 (24페이지)

```
/auth/                                    # 공개 (4페이지)
├── login                                 # 로그인 (앱 진입점)
├── signup                                # STAR 회원가입
├── forgot-password                       # 비밀번호 찾기
└── reset-password                        # 비밀번호 재설정

/videos/                                  # 영상 브라우저 - 로그인 필수 (2페이지)
├── (목록 - Grid + Filter + 검색)
└── [id] (상세 - 스트리밍 + 키워드 검색)

/stars/                                   # STAR 전용 (10페이지)
├── dashboard                             # 대시보드
├── project-board                         # 제작요청 게시판
├── request-detail/[id]                   # 요청 상세
├── my-videos                             # 내 영상 관리 (메타데이터 수정, 파일 교체)
├── upload                                # 영상 업로드
├── feedback                              # 피드백 확인
├── earnings                              # 정산 내역
├── portfolio                             # 포트폴리오
├── profile                               # 프로필
└── settings                              # 설정

/admin/                                   # ADMIN 전용 (8페이지)
├── (대시보드)                             # 메인 대시보드
├── requests                              # 제작요청 관리
├── reviews                               # 제출 영상 조회
│   └── [id]                              # 영상 상세 + 피드백 작성
├── videos                                # 전체 영상 관리
├── stars                                 # STAR 회원 관리
│   └── [id]                              # STAR 상세 (단가 설정)
└── settlements                           # 정산 관리
```

### 4.2 레이아웃

| Route Group | 레이아웃 | 적용 경로 |
|-------------|---------|-----------|
| **auth** | 중앙 카드 + 그라데이션 배경 | /auth/* |
| **dashboard** | Sidebar + Header + 알림 뱃지 | /stars/* |
| **admin** | AdminSidebar + Header + 알림 뱃지 | /admin/* |
| **videos** | Header + 알림 뱃지 | /videos/* |

---

## 5. 데이터 모델 (축소)

### 5.1 모델 목록 (13개)

| 도메인 | 모델 | 설명 |
|--------|------|------|
| **사용자** | User | 중심 엔티티 (role: ADMIN/STAR, baseRate 추가). Supabase Auth와 연동 |
| **제작요청** | ProjectRequest | 제작 의뢰 게시판 |
| **수락** | ProjectAssignment | STAR의 요청 수락 |
| **제출** | Submission | 다중 버전 영상 제출 |
| **피드백** | Feedback | 타임코드 + Canvas 마킹 |
| **영상** | Video | 승인된 영상 자산 |
| **영상 스펙** | VideoTechnicalSpec | 기술 스펙 (해상도, 코덱 등) |
| **영상 로그** | VideoEventLog | 상태 변경 이력 |
| **정산** | Settlement | 월별 정산 |
| **정산 항목** | SettlementItem | 건별 금액 (신규) |
| **포트폴리오** | Portfolio | STAR 포트폴리오 |
| **포트폴리오 항목** | PortfolioItem | 포트폴리오 개별 작품 |
| **카테고리** | Category | 영상 분류 메타데이터 |

### 5.2 핵심 관계도

```
User (STAR)
  ├─ baseRate (Decimal)                    — 기본 단가
  ├─ ProjectAssignment ──→ ProjectRequest  — 제작요청 수락
  │     └─ Submission (최대 5 버전)         — 영상 제출
  │           └─ Feedback                  — 타임코드 피드백
  ├─ Video                                 — 승인된 영상
  │     ├─ VideoTechnicalSpec
  │     └─ VideoEventLog
  ├─ Settlement                            — 월별 정산
  │     └─ SettlementItem[]                — 건별 금액
  └─ Portfolio ──→ PortfolioItem[]         — 포트폴리오

User (ADMIN)
  ├─ ProjectRequest.createdBy              — 제작요청 생성
  ├─ Feedback.authorId                     — 피드백 작성
  └─ Settlement (생성/조정/확정)
```

### 5.3 제거된 모델 (20개)

| 제거 모델 | 사유 |
|-----------|------|
| Project | 레거시, ProjectRequest로 대체 |
| VideoEmbedding | AI/pgvector 제거 |
| Channel | 채널 메타데이터 불필요 |
| Course, Module, Lesson, Enrollment | LMS 제거 |
| Contest, ContestEntry | 공모전 제거 |
| Campaign | 광고 캠페인 제거 |
| Lead | 리드 수집 제거 |
| Counselor | 상담사 제거 |
| Organization | 클라이언트 조직 제거 |
| ChatRoom, ChatMessage, ChatParticipant | 채팅 제거 |
| Notification | 실시간 알림 제거 (뱃지로 대체) |
| Post | 뉴스/공지 제거 |
| Resource | 학습 자료 제거 |
| PerformanceMetric | 성과 지표 제거 |
| Maker | 메타데이터 제거 |

---

## 6. API 전체 목록

> Next.js API Routes (`/app/api/...`) 기반. 모든 경로는 `/api/` 프리픽스.
> 인증은 Supabase Auth 세션 기반 — 별도 JWT 발급 API 불필요.

### 6.1 인증

Supabase Auth 클라이언트 SDK로 처리. 별도 API Route 불필요.

| 기능 | 클라이언트 SDK 호출 |
|------|---------------------|
| 로그인 | `supabase.auth.signInWithPassword()` |
| 회원가입 | `supabase.auth.signUp()` |
| 로그아웃 | `supabase.auth.signOut()` |
| 비밀번호 리셋 | `supabase.auth.resetPasswordForEmail()` |
| 비밀번호 변경 | `supabase.auth.updateUser()` |

### 6.2 제작요청 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/projects/requests/board` | ADMIN, STAR |
| POST | `/api/projects/requests` | ADMIN |
| GET | `/api/projects/requests/:id` | ADMIN, STAR |
| POST | `/api/projects/requests/:id/accept` | STAR |
| PATCH | `/api/projects/requests/:id` | ADMIN |
| DELETE | `/api/projects/requests/:id` | ADMIN |
| GET | `/api/projects/my-assignments` | STAR |

### 6.3 제출물 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| POST | `/api/submissions/upload-url` | STAR |
| POST | `/api/submissions` | STAR |
| GET | `/api/submissions/my` | STAR |
| GET | `/api/submissions` | ADMIN |
| GET | `/api/submissions/:id` | ADMIN, STAR(본인) |
| PATCH | `/api/submissions/:id` | ADMIN, STAR(본인) |
| PATCH | `/api/submissions/:id/approve` | ADMIN |
| PATCH | `/api/submissions/:id/reject` | ADMIN |

### 6.4 피드백 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| POST | `/api/feedback` | ADMIN |
| GET | `/api/feedback?submissionId=` | ADMIN, STAR(본인 제출물) |
| GET | `/api/feedback/:id` | ADMIN, STAR(본인 제출물) |
| PATCH | `/api/feedback/:id` | ADMIN(작성자) |
| DELETE | `/api/feedback/:id` | ADMIN(작성자) |

### 6.5 영상 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/videos` | ADMIN, STAR |
| GET | `/api/videos/:id` | ADMIN, STAR |
| GET | `/api/videos/:id/preview` | ADMIN, STAR |
| GET | `/api/videos/search?q=` | ADMIN, STAR |
| PATCH | `/api/videos/:id` | ADMIN(전체), STAR(본인) |
| POST | `/api/videos/:id/replace` | ADMIN(전체), STAR(본인) |
| POST | `/api/videos/upload-url` | ADMIN, STAR |
| POST | `/api/videos/sync` | ADMIN |

### 6.6 정산 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| POST | `/api/settlements/generate` | ADMIN |
| GET | `/api/settlements` | ADMIN(전체), STAR(본인) |
| GET | `/api/settlements/:id` | ADMIN, STAR(본인) |
| PATCH | `/api/settlements/:id/items/:itemId` | ADMIN |
| PATCH | `/api/settlements/:id/complete` | ADMIN |

### 6.7 포트폴리오 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/portfolios/me` | STAR |
| PATCH | `/api/portfolios/me` | STAR |
| POST | `/api/portfolios/me/items` | STAR |
| PATCH | `/api/portfolios/me/items/:itemId` | STAR |
| DELETE | `/api/portfolios/me/items/:itemId` | STAR |
| PATCH | `/api/portfolios/me/items/reorder` | STAR |
| GET | `/api/portfolios/user/:userId` | ADMIN |

### 6.8 사용자/관리 (인증 필수)

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/users/me` | ADMIN, STAR |
| PATCH | `/api/users/me` | ADMIN, STAR |
| GET | `/api/admin/stars` | ADMIN |
| GET | `/api/admin/stars/:id` | ADMIN |
| PATCH | `/api/admin/stars/:id` | ADMIN |

### 6.9 알림 뱃지

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/notifications/badge` | ADMIN, STAR |

### 6.10 시스템

| Method | Path | 권한 |
|--------|------|------|
| GET | `/api/health` | 공개 |

**총 API Route: 40개**

---

## 7. 기술 아키텍처

### 7.1 시스템 구성

```
[브라우저] → [Vercel (Next.js 15 — 프론트 + API Routes 통합)]
                ↓ Prisma                    ↓ REST API
          [Supabase PostgreSQL]    [Cloudflare Stream / R2]
                ↓
          [Supabase Auth]
```

**단일 배포**: Vercel 하나로 프론트엔드 + API 모두 처리. 별도 백엔드 서버 없음.

### 7.2 기술 스택

| 계층 | 기술 | 설명 |
|------|------|------|
| **프레임워크** | Next.js 15 (App Router) | 프론트 + API Routes 통합 |
| **UI** | React 19 + Tailwind CSS v4 + shadcn/ui | Radix UI 기반 컴포넌트 |
| **상태관리** | Zustand (클라이언트) + TanStack Query (서버) | 캐싱 + 상태 |
| **ORM** | Prisma | Supabase PostgreSQL 연결 |
| **인증** | Supabase Auth | 세션/토큰 관리, 비밀번호 리셋 이메일 내장 |
| **데이터베이스** | Supabase PostgreSQL | Supavisor 트랜잭션 모드 (포트 6543) |
| **영상 스트리밍** | Cloudflare Stream | HLS signed URL, tus 업로드 |
| **영상 백업** | Cloudflare R2 | 원본 파일 백업 저장 |
| **영상 플레이어** | Plyr + HLS.js | Cloudflare Stream HLS 재생 |
| **피드백 마킹** | Fabric.js | Canvas 기반 화면 어노테이션 |
| **에러 추적** | Sentry | Vercel + Next.js 공식 연동 |
| **테스트** | Vitest | 유닛 테스트 |
| **패키지 매니저** | pnpm | Vercel 기본 지원 |
| **배포** | Vercel | 단일 배포 (프론트 + API) |

### 7.3 제거 항목

| 항목 | 사유 |
|------|------|
| NestJS | 별도 백엔드 제거 → Next.js API Routes로 대체 |
| Cloud Run | 별도 백엔드 제거 → Vercel 단일 배포 |
| Turborepo | 모노레포 불필요 → 단일 Next.js 앱 |
| Socket.io | 실시간 기능 제거 |
| Upstash Redis | 실시간 제거 + 별도 캐시 불필요 |
| Resend | Supabase Auth 내장 이메일로 대체 |
| Google Generative AI / OpenAI | AI 기능 제거 |
| pgvector | 벡터 검색/추천 제거 |
| Passport.js | Supabase Auth로 대체 |
| argon2 / bcrypt | Supabase Auth가 비밀번호 관리 |

### 7.4 Prisma + Supabase 연결 설정

```env
# Supavisor 트랜잭션 모드 (서버리스 최적화)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# 마이그레이션용 직접 연결
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

---

## 8. 마이그레이션 (에어테이블 → 신규 시스템)

### 8.1 현황

| 항목 | 설명 |
|------|------|
| 데이터 소스 | 에어테이블 (임시 운영 중) |
| 영상 건수 | 400건+ |
| 데이터 구성 | 영상 파일 (첨부파일) + 메타데이터 (이름, 분류 등) |
| 제약 | 에어테이블 첨부파일 URL은 임시 URL (만료됨) |

### 8.2 마이그레이션 대상

```
에어테이블 (400건+)
  ├─ 메타데이터 (이름, 분류 등) → Supabase PostgreSQL (Video 테이블)
  ├─ 영상 파일 → Cloudflare Stream (스트리밍용)
  └─ 영상 원본 → Cloudflare R2 (백업용)
```

### 8.3 마이그레이션 흐름

```
1. 에어테이블 API로 전체 레코드 조회
   ↓
2. 각 레코드의 첨부파일 URL로 영상 다운로드 (URL 만료 전)
   ↓
3. Cloudflare Stream에 업로드 (tus) → streamUid 획득
   ↓
4. Cloudflare R2에 원본 백업 → r2Key 획득
   ↓
5. Supabase DB에 메타데이터 + streamUid + r2Key 저장
   ↓
6. 검증: DB 레코드 수 = 에어테이블 레코드 수, 영상 재생 확인
```

### 8.4 마이그레이션 스크립트 요구사항

- 에어테이블 API 키 + Base ID 필요
- 실패 건 재시도 로직 (네트워크 오류 대비)
- 진행 상황 로깅 (N/400 완료)
- 중복 방지 (이미 마이그레이션된 건 스킵)

---

## 9. 축소 전후 비교

| 항목 | 축소 전 | 축소 후 | 감소율 |
|------|:-------:|:-------:|:------:|
| 사용자 역할 | 7개 | 2개 | -71% |
| 페이지 | 49개 | 24개 | -51% |
| DB 모델 | 33개 | 13개 | -61% |
| API 엔드포인트 | 60+개 | 40개 | -33% |
| 핵심 기능 | 12개 | 8개 | -33% |
| 배포 서비스 | 2개 (Vercel + Cloud Run) | 1개 (Vercel) | -50% |
| 외부 의존성 | 10+개 | 6개 | -40% |

### 9.1 최종 외부 서비스

| 서비스 | 용도 | 예상 비용 |
|--------|------|-----------|
| Vercel | 프론트 + API 배포 | $0 (Free) ~ $20 (Pro) |
| Supabase | DB + Auth | $0 (Free) ~ $25 (Pro) |
| Cloudflare Stream | 영상 스트리밍 | ~$5/월 |
| Cloudflare R2 | 영상 원본 백업 | ~$0 (10GB 무료) |
| Sentry | 에러 추적 | $0 (Free) |
| **합계** | | **$5 ~ $50/월** |

---

*축소 기획서 작성 완료. 원본 역설계 문서(REVERSE-ENGINEERED-SPEC.md) 대비 핵심 영상 제작 파이프라인에 집중한 내부 도구 기획서입니다.*
