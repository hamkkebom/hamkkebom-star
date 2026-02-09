# 함께봄-스타 역설계 기획서

> **문서 목적**: 현재 코드베이스 기반 역설계. "지금 구조 그대로 처음부터 만든다면" 작성했을 기획서.
>
> **역설계 기준일**: 2026-02-07 | **커밋**: 67de6f5 (main)

---

## 1. 제품 개요

### 1.1 제품명
**함께봄-스타** (Hamkkebom-Star / 별들에게 물어봐)

### 1.2 한 줄 요약
AI 영상 제작 인재를 육성하고, 프리랜서-클라이언트를 매칭하며, 교육-제작-마케팅을 순환시키는 통합 생태계 플랫폼.

### 1.3 비즈니스 모델

```
┌─────────────────────────────────────────────────────┐
│                   순환 구조                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [교육] ──→ [프리랜서 150명+] ──→ [영상 제작]       │
│  수익1: 교육비      ↑                   ↓           │
│       ↑        [공모전]            [마케팅]          │
│       │         인재발굴               ↓            │
│       └───── 대행업체 ←── 상담사 500명 ─┘           │
│             (고정 클라이언트)                         │
│              수익3: 대행비     수익2: 제작비          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.4 수익 구조

| 수익원 | 설명 | 상태 |
|--------|------|------|
| **교육비** | AI 영상 제작 유료 교육 과정 (기초반 2급 / 심화반 1급) | DB 모델 구현 |
| **제작비** | 프리랜서(STAR) 영상 제작 -> 1차/2차 정산 | 핵심 기능, 완전 구현 |
| **대행비** | 상담사(500명) 대상 종합 마케팅 대행 | DB 모델 구현, UI 준비중 |

---

## 2. 사용자 역할 체계 (RBAC)

### 2.1 역할 정의

| 역할 | 코드 | 설명 | 주요 권한 |
|------|------|------|-----------|
| **슈퍼 관리자** | `ADMIN` | 전체 시스템 관리 | 모든 기능 접근 |
| **달 관리자 (통합)** | `MOON_MANAGER` | 통합 운영 관리 | 정산 생성/수정, 프로젝트 관리 |
| **광고 관리자** | `MOON_ADVERTISING` | 광고/캠페인 관리 | 캠페인 CRUD |
| **피드백 관리자** | `MOON_FEEDBACK` | 영상 피드백 관리 | 피드백 작성/관리 |
| **정산 관리자** | `MOON_SETTLEMENT` | 정산 전담 | 정산 생성/수정/승인 |
| **스타 (프리랜서)** | `STAR` | 영상 제작자 | 프로젝트 수락, 영상 업로드, 정산 조회 |
| **상담사** | `COUNSELOR` | 피드백 제공자 | 피드백 작성 |

### 2.2 권한 매트릭스

| 기능 | ADMIN | MOON_* | STAR | COUNSELOR | 비로그인 |
|------|:-----:|:------:|:----:|:---------:|:--------:|
| 관리자 대시보드 | O | O | - | - | - |
| 프로젝트 생성 | O | O | - | - | - |
| 제작요청 게시판 열람 | O | O | O | - | - |
| 제작요청 수락 | - | - | O | - | - |
| 영상 업로드 | O | O | O | - | - |
| 피드백 작성 | O | O | - | O | - |
| 정산 생성/수정 | O | 정산관리자만 | - | - | - |
| 정산 내역 조회 | O | 정산관리자만 | 본인만 | - | - |
| 포트폴리오 관리 | O | O | O | - | - |
| 영상 브라우저 | O | O | O | O | O |
| 설명회 신청 | - | - | - | - | O |

### 2.3 가드 구현

```
JwtAuthGuard (인증) + RolesGuard (인가)
  ├─ @UseGuards(JwtAuthGuard)           → 로그인 필수
  ├─ @UseGuards(JwtAuthGuard, RolesGuard)
  │   └─ @Roles(ADMIN, MOON_SETTLEMENT) → 특정 역할만
  └─ 가드 없음                           → 공개 API (leads, 영상 목록)
```

---

## 3. 핵심 기능 명세

### 3.1 인증 (Auth)

| 기능 | API | 설명 |
|------|-----|------|
| 로그인 | `POST /auth/login` | 이메일+비밀번호. JWT 토큰 쌍 반환 |
| 회원가입 | `POST /auth/signup` | 역할별 분기 (스타/클라이언트) |
| 토큰 갱신 | `POST /auth/refresh` | refresh_token으로 새 토큰 발급 |
| 로그아웃 | `POST /auth/logout` | 클라이언트 토큰 폐기 |
| 비밀번호 리셋 요청 | `POST /auth/password-reset/request` | 이메일 발송 (Resend) |
| 비밀번호 리셋 확인 | `PATCH /auth/password-reset/confirm` | 토큰 검증 + 새 비밀번호 |

**프론트엔드 페이지**:
- `/auth/login` - 로그인
- `/auth/signup` - 역할 선택 (스타/클라이언트)
- `/auth/signup/stars` - 스타 회원가입
- `/auth/signup/client` - 클라이언트 회원가입
- `/auth/forgot-password` - 비밀번호 찾기
- `/auth/reset-password` - 비밀번호 재설정
- `/auth/verify-email` - 이메일 인증

**기술**: JWT (access + refresh) + Passport.js + Supabase Auth 미들웨어 세션 관리. 비밀번호: argon2 + bcrypt 병행.

---

### 3.2 제작요청 게시판 & 프로젝트 매칭

#### 3.2.1 제작요청 (ProjectRequest)

프리랜서(STAR)에게 영상 제작을 의뢰하는 게시판 시스템.

| 필드 | 타입 | 설명 |
|------|------|------|
| title | string | 요청 제목 |
| categories | string[] | 브랜드/코너/등급/고민/시기 분류 |
| deadline | DateTime | 마감일 |
| assignmentType | SINGLE/MULTIPLE | 독점(1명) 또는 중복(여러 명) |
| maxAssignees | int (기본 3) | 최대 수락 인원 |
| estimatedBudget | Decimal | 예상 예산 |
| requirements | string | 제작 가이드라인 |
| referenceUrls | string[] | 참고 URL |

**상태 흐름**:
```
OPEN → FULL (정원 도달) → CLOSED (마감)
  └→ CANCELLED (취소)
```

#### 3.2.2 프리랜서 수락 (ProjectAssignment)

| 상태 | 설명 |
|------|------|
| ACCEPTED | 수락됨 (즉시) |
| IN_PROGRESS | 제작 진행중 |
| SUBMITTED | 제출 완료 |
| COMPLETED | 최종 완료 |
| CANCELLED | 취소됨 |

**API 엔드포인트**:
- `GET /projects/requests/board` - 게시판 목록 (인증된 STAR 열람)
- `POST /projects/requests` - 요청 생성 (관리자/매니저)
- `POST /projects/requests/:id/accept` - 수락 (STAR)
- `GET /projects/my-assignments` - 내 수락 내역

**프론트엔드 페이지**:
- `/stars/project-board` - 제작요청 게시판
- `/stars/request-detail/[id]` - 요청 상세
- `/stars/requests/create` - 요청 생성

#### 3.2.3 프로젝트 (Project)

Airtable에서 마이그레이션된 기존 프로젝트 모델. 1:N 관계로 영상(Video)과 연결.

**상태 흐름**:
```
DRAFT → PENDING → MATCHING → IN_PROGRESS → REVIEW → COMPLETED
                                    └→ REVISION ─┘
                                    └→ CANCELLED
```

**프론트엔드 페이지**:
- `/stars/my-projects` - 내 프로젝트 목록
- `/stars/my-projects/detail/[id]` - 프로젝트 상세

---

### 3.3 영상 제출 & 피드백 시스템

#### 3.3.1 제출물 (Submission)

프리랜서가 제작한 영상을 업로드하는 다중 버전 시스템.

| 핵심 기능 | 설명 |
|-----------|------|
| **다중 버전 (1~5)** | versionSlot(1~5)로 최대 5개 버전 동시 관리 |
| **버전 타이틀** | "경쾌한 톤", "차분한 톤" 등 설명 가능 |
| **자동 리비전** | version 필드로 v1.0, v1.1... 추적 |
| **Cloudflare Stream** | tus 프로토콜 업로드 -> Stream signed URL 재생 |
| **자막 생성** | AI 기반 자막 생성 + 수동 업로드 |

**상태**: PENDING -> IN_REVIEW -> APPROVED / REJECTED / REVISED

**API 엔드포인트**:
- `POST /submissions/upload-url` - tus 업로드 URL 발급
- `POST /submissions` - 제출물 생성
- `GET /submissions/my` - 내 제출물 목록
- `POST /submissions/:id/captions` - AI 자막 생성

**프론트엔드 페이지**:
- `/stars/upload` - 영상 업로드 (Cloudflare Stream tus)
- `/stars/feedback` - 피드백 확인

#### 3.3.2 피드백 (Feedback)

타임코드 기반 영상 피드백 + Canvas 마킹 시스템.

| 핵심 기능 | 설명 |
|-----------|------|
| **타임코드 범위** | startTime ~ endTime (초 단위 구간 지정) |
| **피드백 유형** | 자막/BGM/컷편집/색보정 분류 |
| **우선순위** | LOW / NORMAL / HIGH / URGENT |
| **화면 마킹** | Fabric.js Canvas 기반 어노테이션 (JSON 저장) |
| **권한 제어** | 작성자 본인만 수정 가능 (canUpdateFeedback) |

**상태**: PENDING -> RESOLVED / WONTFIX

**프론트엔드 컴포넌트**:
- `feedback-panel.tsx` - 피드백 목록/작성 패널
- `annotation-canvas.tsx` (418줄) - Fabric.js 기반 화면 마킹

---

### 3.4 영상 자산 관리 (Video Asset Management)

#### 3.4.1 데이터 모델

```
Video (영상)
  ├─ VideoTechnicalSpec (기술 스펙: 해상도, 코덱, 비트레이트, R2 키, Stream UID)
  ├─ VideoEventLog (이벤트 로그: 상태 변경 이력)
  └─ VideoEmbedding (벡터 임베딩: pgvector 768차원, 추천/검색용)
```

**영상 상태**: DRAFT -> PENDING -> APPROVED -> FINAL

#### 3.4.2 영상 브라우저

Netflix 스타일 영상 탐색 시스템.

| 기능 | 구현 |
|------|------|
| **필터링** | 카테고리, 상담사, 크리에이터, 정렬(최신/인기) |
| **카테고리 스윔레인** | 수평 스크롤 카테고리별 영상 |
| **검색** | 키워드 + 벡터 기반 유사도 검색 |
| **추천** | pgvector 임베딩 기반 유사 영상 추천 |
| **스트리밍** | Plyr + HLS.js, Cloudflare Stream signed URL |

**API 엔드포인트**:
- `GET /videos` - 목록 (페이지네이션, 필터)
- `GET /videos/:id` - 상세 (기술 스펙 포함)
- `GET /videos/:id/preview` - signed URL 발급
- `GET /videos/search?q=` - 검색
- `GET /videos/:id/recommendations` - 추천
- `GET /videos/channel/:name` - 채널별 영상
- `POST /videos/sync` - Cloudflare Stream <-> DB 동기화
- `POST /videos/import-stream` - URL에서 임포트

**프론트엔드 페이지**:
- `/videos` - 영상 브라우저 (Advanced Grid + Filter)
- `/videos/[id]` - 영상 상세 (VideoDetailClient)
- `/videos/category/[slug]` - 카테고리별 영상
- `/stars/my-videos` - 내 영상 관리

#### 3.4.3 기술 스펙 자동 수집

| 필드 | 설명 |
|------|------|
| filename, format, fileSize, duration | 기본 파일 정보 |
| videoCodec, width, height, fps, aspectRatio | 비디오 스트림 |
| audioCodec, audioChannels, sampleRate | 오디오 스트림 |
| r2Key, streamUid | 저장소 참조 |
| thumbnailUrl (AVIF/WebP/OG 변형) | 다중 형식 썸네일 |

---

### 3.5 정산 시스템

#### 3.5.1 정산 구조

| 구분 | 설명 |
|------|------|
| **1차 정산 (PRIMARY)** | 영상 제작비 지급 |
| **2차 정산 (SECONDARY)** | 인센티브 (분기별) |
| **유형** | PAYOUT(지급) / DEDUCTION(공제) / BONUS(보너스) |

**상태**: PENDING -> PROCESSING -> COMPLETED / FAILED

**분기 관리**: quarterYear(년도) + quarterNumber(1~4)

**API 엔드포인트**:
- `POST /settlements` - 정산 생성 (ADMIN, MOON_MANAGER, MOON_SETTLEMENT만)
- `GET /settlements` - 목록 (관리자: 전체, STAR: 본인만)
- `PATCH /settlements/:id` - 수정 (관리자 전용)

**프론트엔드 페이지**:
- `/stars/earnings` - 정산 내역 (프리랜서 뷰)
- `/admin/stars/payouts` - 정산 관리 (관리자 뷰)
- `/admin/finance` - 재무 대시보드
- `/admin/finance/revenue` - 매출 현황
- `/admin/finance/payouts` - 정산 지급 관리

---

### 3.6 교육 (LMS)

#### 3.6.1 구조

```
Course (과정)
  ├─ level: BASIC(기초반 2급) / ADVANCED(심화반 1급)
  ├─ price: 유료 과정 가격
  └─ Module (모듈)
       └─ Lesson (레슨)
            ├─ type: VIDEO / TEXT / QUIZ
            ├─ videoR2Key: R2 저장 영상
            └─ duration: 레슨 길이

Enrollment (수강 등록)
  ├─ status: ACTIVE / COMPLETED / CANCELLED
  └─ progress: 0~100%
```

**프론트엔드 페이지**:
- `/education/session` - 설명회 안내
- `/stars/resources` - 학습 자료실

---

### 3.7 공모전 (Contest)

| 상태 | 설명 |
|------|------|
| UPCOMING | 예정 |
| ONGOING | 진행중 |
| JUDGING | 심사중 |
| COMPLETED | 완료 |

**출품작 상태**: SUBMITTED -> SHORTLISTED -> WINNER / REJECTED

구조: Contest 1:N ContestEntry (사용자당 공모전별 1개, @@unique)

---

### 3.8 포트폴리오

프리랜서 개인 포트폴리오 관리.

| 기능 | 설명 |
|------|------|
| 프로필 | bio, showreel, website, socialLinks |
| 아이템 관리 | CRUD + 순서 변경 (drag & reorder) |
| 공개 조회 | `/portfolios/user/:userId` (인증 불필요) |
| 내 포트폴리오 | `/portfolios/me` (auto findOrCreate) |

**프론트엔드 페이지**: `/stars/portfolio`
**프론트엔드 컴포넌트**: PortfolioCard, PortfolioGrid, PortfolioEditorModal (333줄), PortfolioDetailModal

---

### 3.9 상담사 관리 (Counselor)

500명+ 오프라인 상담사 데이터 관리.

| 데이터 카테고리 | 필드 |
|----------------|------|
| 기본 정보 | name, displayName, shortId, phone, email |
| 프로필 | profileImageUrl, introduction, career, notice |
| 분류 | majorCategories[], tags[], category, region |
| 플래그 | isKokkok, isDonation, isGift, hasRateIncrease 등 |
| 요금 | prevFee, increasedFee |
| 시간 | targetTimeCurrent, targetTimePrev, waitingTime |
| 연결 | agencyId (대행업체 User 연결) |

---

### 3.10 실시간 기능

#### 3.10.1 채팅

```
ChatRoom 1:N ChatMessage
ChatRoom N:M User (via ChatParticipant)
```

- Socket.io + Redis adapter (Upstash)
- 개인/그룹 채팅방
- lastSeenAt 읽음 추적

#### 3.10.2 알림

| 알림 유형 | 트리거 |
|-----------|--------|
| PROJECT_ASSIGNED | 프로젝트 배정 |
| FEEDBACK_RECEIVED | 피드백 수신 |
| PAYMENT_COMPLETED | 정산 완료 |
| NEW_REQUEST | 새 제작요청 |
| CONTEST_UPDATE | 공모전 업데이트 |
| SYSTEM | 시스템 공지 |

프론트엔드: NotificationBell 컴포넌트 (Socket.io 실시간 수신)

---

### 3.11 리드 수집 (Lead)

설명회 신청자 수집. **인증 불필요** (공개 API).

| 필드 | 설명 |
|------|------|
| name, email, phone | 연락처 |
| channel | 유입 경로 (인스타, 지인 등) |
| interest | 관심 분야 (기초반, 심화반) |
| isAttended | 참석 여부 |

프론트엔드: `lead-form.tsx` 컴포넌트

---

### 3.12 광고 캠페인 (Campaign)

| 필드 | 설명 |
|------|------|
| platform | YouTube, Instagram, Facebook 등 (다중) |
| budget | 예산 |
| targetAudience | JSON (타겟 오디언스) |
| views, clicks, conversions | 성과 지표 |

**상태**: DRAFT -> SCHEDULED -> ACTIVE -> PAUSED -> COMPLETED / CANCELLED

---

## 4. 화면 구조 (Sitemap)

### 4.1 전체 페이지 맵 (49 페이지)

```
/ (홈 - VibrantHero + VideoGrid)
├── /about                              # 회사소개
├── /privacy                            # 개인정보처리방침
├── /terms                              # 이용약관
│
├── /auth/                              # 인증 (5 페이지)
│   ├── login
│   ├── signup (역할 선택)
│   │   ├── stars (스타 가입)
│   │   └── client (클라이언트 가입)
│   ├── forgot-password
│   ├── reset-password
│   └── verify-email
│
├── /videos/                            # 영상 브라우저 - 공개 (3 페이지)
│   ├── (목록 - Advanced Grid)
│   ├── [id] (상세)
│   └── category/[slug] (카테고리별)
│
├── /stars/                             # 프리랜서 - 공개 (3 페이지)
│   ├── (스타 소개)
│   ├── open-projects (공개 프로젝트)
│   └── direct-upload (다이렉트 업로드)
│
├── /education/
│   └── session                         # 설명회 안내
│
├── /stars/ (대시보드)                   # 프리랜서 전용 (17 페이지)
│   ├── dashboard (메인 대시보드)
│   │   └── analytics (분석)
│   ├── project-board (제작요청 게시판)
│   ├── request-detail/[id] (요청 상세)
│   ├── requests/create (요청 생성)
│   ├── my-projects (내 프로젝트)
│   │   └── detail/[id] (프로젝트 상세)
│   ├── my-videos (내 영상)
│   ├── upload (영상 업로드)
│   ├── feedback (피드백)
│   ├── earnings (정산 내역)
│   ├── portfolio (포트폴리오)
│   ├── performance (성과)
│   ├── resources (자료실)
│   ├── work-journal (작업 일지)
│   ├── profile (프로필)
│   └── settings (설정)
│
└── /admin/                             # 관리자 전용 (12 페이지)
    ├── (대시보드)
    ├── stars/ (프리랜서 관리)
    │   ├── (인재 허브)
    │   ├── projects (프로젝트)
    │   ├── requests (제작요청)
    │   ├── reviews (리뷰)
    │   │   └── [id] (리뷰 상세)
    │   └── payouts (정산)
    ├── clients (클라이언트)
    ├── videos (영상 관리)
    ├── finance/ (재무)
    │   ├── (대시보드)
    │   ├── revenue (매출)
    │   └── payouts (지급)
    ├── activity-log (활동 로그)
    └── settings (설정)
```

### 4.2 레이아웃 체계

| Route Group | 레이아웃 구성 | 적용 경로 |
|-------------|--------------|-----------|
| **(public)** | SimpleHeader + MainFooter + FloatingCTA | /videos, /stars, /about, /education |
| **(dashboard)** | Sidebar + Header | /stars/* (인증 필요) |
| **(admin)** | AdminSidebar + Breadcrumbs | /admin/* (관리자 권한) |
| **auth** | 중앙 카드 + 그라데이션 배경 | /auth/* |
| **root** | VibrantHero 풀스크린 | / |

---

## 5. 데이터 모델 (ERD 요약)

### 5.1 모델 목록 (33개)

| 도메인 | 모델 | 관계 |
|--------|------|------|
| **사용자** | User | 중심 엔티티. 모든 도메인 연결 |
| **제작요청** | ProjectRequest, ProjectAssignment | 게시판 -> 수락 |
| **프로젝트** | Project | Airtable 마이그레이션 레거시 |
| **제출** | Submission | 다중 버전 (versionSlot 1~5) |
| **피드백** | Feedback | 타임코드 + Canvas 마킹 |
| **정산** | Settlement | 1차/2차, 분기별 |
| **영상** | Video, VideoTechnicalSpec, VideoEventLog, VideoEmbedding | 자산 관리 |
| **메타데이터** | Category, Counselor, Channel, Maker | 참조 데이터 |
| **LMS** | Course, Module, Lesson, Enrollment | 교육 시스템 |
| **콘텐츠** | Post | 뉴스/공지/이벤트 |
| **공모전** | Contest, ContestEntry | 공모전 + 출품작 |
| **포트폴리오** | Portfolio, PortfolioItem | 프리랜서 작품집 |
| **자료** | Resource | 학습 자료 (가이드, 템플릿, 디자인, 음향) |
| **알림** | Notification | 실시간 알림 |
| **조직** | Organization | 클라이언트 조직 |
| **성과** | PerformanceMetric | 월별 성과 지표 |
| **채팅** | ChatRoom, ChatMessage, ChatParticipant | 실시간 채팅 |
| **캠페인** | Campaign | 광고 캠페인 |
| **리드** | Lead | 설명회 신청 |

### 5.2 핵심 관계도

```
User (STAR)
  ├─ ProjectAssignment ──→ ProjectRequest (게시판)
  │     └─ Submission (영상 제출, 최대 5 버전)
  │           └─ Feedback (타임코드 피드백)
  ├─ Project (레거시)
  │     └─ Video ──→ VideoTechnicalSpec
  │                  VideoEventLog
  │                  VideoEmbedding (pgvector)
  ├─ Settlement (1차/2차 정산)
  ├─ Portfolio ──→ PortfolioItem[]
  ├─ PerformanceMetric (월별)
  ├─ Enrollment ──→ Course
  ├─ ContestEntry ──→ Contest
  ├─ Notification[]
  └─ ChatParticipant ──→ ChatRoom ──→ ChatMessage[]

User (ADMIN/MOON_*)
  ├─ Project.ownedProjects (프로젝트 소유)
  ├─ ProjectRequest.createdBy (요청 생성)
  └─ Settlement (정산 생성/관리)

Counselor
  ├─ Project.counselorId (프로젝트 연결)
  └─ User.agencyId (대행업체 관리)
```

---

## 6. API 엔드포인트 전체 목록

### 6.1 인증 (Public)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/login` | 로그인 |
| POST | `/auth/signup` | 회원가입 |
| POST | `/auth/refresh` | 토큰 갱신 |
| POST | `/auth/logout` | 로그아웃 |
| POST | `/auth/password-reset/request` | 비밀번호 리셋 요청 |
| PATCH | `/auth/password-reset/confirm` | 비밀번호 리셋 확인 |

### 6.2 프로젝트 (JWT 필수)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/projects` | 프로젝트 생성 |
| GET | `/projects` | 목록 (역할별 필터) |
| GET | `/projects/requests/board` | 제작요청 게시판 |
| GET | `/projects/my-assignments` | 내 수락 내역 |
| POST | `/projects/requests` | 제작요청 생성 |
| POST | `/projects/requests/:id/accept` | 요청 수락 |
| GET | `/projects/:id` | 상세 |
| PATCH | `/projects/:id` | 수정 |
| DELETE | `/projects/:id` | 삭제 |

### 6.3 영상 (Public/Mixed)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/videos` | 영상 목록 (필터, 페이지네이션) |
| GET | `/videos/:id` | 상세 |
| GET | `/videos/:id/preview` | signed URL |
| GET | `/videos/:id/recommendations` | 추천 |
| GET | `/videos/search?q=` | 검색 |
| GET | `/videos/channel/:name` | 채널별 |
| GET | `/videos/project/:projectNo` | 프로젝트 번호로 조회 |
| POST | `/videos/sync` | Storage 동기화 |
| POST | `/videos/import-stream` | URL 임포트 |
| POST | `/videos/upload-url` | tus 업로드 URL |
| POST | `/videos/:id/captions` | AI 자막 생성 |
| PUT | `/videos/:id/captions/:lang` | 자막 업로드 |

### 6.4 제출물 (JWT 필수)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/submissions/upload-url` | 업로드 URL 발급 |
| POST | `/submissions` | 제출물 생성 |
| GET | `/submissions/my` | 내 제출물 |
| GET | `/submissions` | 전체 (projectId 필터) |
| GET | `/submissions/:id` | 상세 |
| PATCH | `/submissions/:id` | 수정 |
| DELETE | `/submissions/:id` | 삭제 |
| POST | `/submissions/:id/captions` | AI 자막 |
| PUT | `/submissions/:id/captions/:lang` | 자막 업로드 |

### 6.5 피드백 (JWT 필수)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/feedback` | 피드백 생성 |
| GET | `/feedback?submissionId=` | 목록 |
| GET | `/feedback/:id` | 상세 |
| PATCH | `/feedback/:id` | 수정 (본인만) |
| DELETE | `/feedback/:id` | 삭제 (본인만) |

### 6.6 정산 (JWT + RBAC)

| Method | Path | 역할 제한 |
|--------|------|-----------|
| POST | `/settlements` | ADMIN, MOON_MANAGER, MOON_SETTLEMENT |
| GET | `/settlements` | 관리자: 전체, STAR: 본인 |
| GET | `/settlements/:id` | 본인 또는 관리자 |
| PATCH | `/settlements/:id` | ADMIN, MOON_MANAGER, MOON_SETTLEMENT |

### 6.7 포트폴리오

| Method | Path | 인증 |
|--------|------|------|
| GET | `/portfolios/user/:userId` | Public |
| GET | `/portfolios/me` | JWT |
| PATCH | `/portfolios/me` | JWT |
| POST | `/portfolios/me/items` | JWT |
| PATCH | `/portfolios/me/items/:itemId` | JWT |
| DELETE | `/portfolios/me/items/:itemId` | JWT |
| PATCH | `/portfolios/me/items/reorder` | JWT |

### 6.8 기타

| Method | Path | 설명 |
|--------|------|------|
| POST | `/leads` | 설명회 신청 (Public) |
| GET | `/leads` | 목록 |
| GET | `/analytics/video/:uid` | 영상 분석 |
| GET | `/health` | 헬스체크 |

---

## 7. 기술 아키텍처

### 7.1 시스템 구성

```
[브라우저] → [Cloudflare CDN] → [Vercel (Next.js 15)]
                                        ↓ API 호출
                                 [Cloud Run (NestJS 11)]
                                   ↓           ↓
                            [Supabase PG]  [Upstash Redis]
                                   ↓
                            [Cloudflare Stream/R2]
```

### 7.2 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| **프론트엔드** | Next.js (App Router) + React + Tailwind CSS v4 | 15.5.9 / 19.0 / 4.0.8 |
| **상태관리** | Zustand (클라이언트) + TanStack Query (서버) | 5.0.10 / 5.62.7 |
| **백엔드** | NestJS + Prisma ORM | 11.1.12 / 6.3.1 |
| **데이터베이스** | PostgreSQL 17 + pgvector | Supabase 호스팅 |
| **캐시** | Redis (Upstash) | Socket.io adapter |
| **영상 스토리밍** | Cloudflare Stream (HLS signed URL) | - |
| **오브젝트 스토리지** | Cloudflare R2 | - |
| **이메일** | Resend API | - |
| **에러 추적** | Sentry | - |
| **AI** | Google Generative AI + OpenAI | 듀얼 |
| **빌드** | Turborepo + pnpm | 2.7.5 / 9.15.2 |

### 7.3 인프라 비용

| 서비스 | 월 비용 | 비고 |
|--------|---------|------|
| Vercel | $0 | Free tier |
| Cloud Run | $0 | 3개월 무료 크레딧 |
| Supabase | $25 | Pro plan (서울) |
| Cloudflare Stream | $5 | 영상 스토리지 |
| Upstash | $0 | Free tier |
| **합계** | **~$30/월** | |

---

## 8. 구현 상태 요약

### 8.1 완전 구현 (Production Ready)

| 기능 | 프론트 | 백엔드 | 테스트 |
|------|:------:|:------:|:------:|
| 인증 (JWT + Supabase) | O | O | O |
| 영상 브라우저 | O | O | O |
| 제작요청 게시판 | O | O | O |
| 영상 업로드 (Stream tus) | O | O | - |
| 피드백 + Canvas 마킹 | O | O | O |
| 정산 (1차/2차, RBAC) | O | O | O |
| 포트폴리오 CRUD | O | O | - |
| 리드 수집 | O | O | - |
| 실시간 알림 | O | O | - |
| 영상 동기화 (Stream<->DB) | - | O | O |

### 8.2 DB 모델만 구현 (UI 미완성)

| 기능 | 설명 |
|------|------|
| LMS (교육) | Course/Module/Lesson 모델 완료, 프론트 미구현 |
| 공모전 | Contest/ContestEntry 모델 완료, 프론트 미구현 |
| 광고 캠페인 | Campaign 모델 완료, 프론트 미구현 |
| 채팅 | ChatRoom/Message 모델 + Gateway 완료, 프론트 부분 구현 |
| 성과 지표 | PerformanceMetric 모델 완료, 프론트 페이지만 존재 |

### 8.3 테스트 커버리지

| 구분 | 커버리지 | 프레임워크 |
|------|:--------:|-----------|
| 프론트엔드 Unit | 94.72% | Vitest + jsdom |
| 백엔드 Unit | 93.57% | Jest + @nestjs/testing |
| E2E | 5/12 spec | Playwright (6 skipped) |
| 부하 | 5 시나리오 | k6 |

---

## 9. 비기능 요구사항

### 9.1 성능

- Lighthouse CI: PR마다 자동 측정
- `content-visibility: auto`: 긴 리스트 렌더링 최적화
- `optimizePackageImports`: lucide-react, framer-motion, date-fns 트리셰이킹
- 이미지: AVIF/WebP 자동 변환, Next.js Image 최적화
- RSC 우선: 서버 컴포넌트 기본 -> 클라이언트 번들 최소화

### 9.2 보안

- JWT + Refresh Token 체계
- CORS: 화이트리스트 기반 (localhost, hamkkebom.com)
- ValidationPipe: whitelist + forbidNonWhitelisted (알 수 없는 필드 차단)
- Sentry: 에러 추적
- pnpm overrides: 보안 취약점 패치 (esbuild, tar, lodash, next 등)
- GitHub Actions: 주간 보안 스캔 (Dependabot)

### 9.3 운영

- CI/CD: GitHub Actions (테스트 -> 린트 -> 빌드 -> 배포)
- Conventional Commits: Husky + commitlint 강제
- Docker Compose: 로컬 PostgreSQL 17 + Redis 7.4
- 65개 운영 스크립트 (마이그레이션, 진단, 배포)

---

*역설계 완료. 이 문서는 코드베이스에서 자동 추출된 사실 기반 기획서입니다.*
