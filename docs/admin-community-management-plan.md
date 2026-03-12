# 관리자 커뮤니티 종합 관리 시스템 구현 계획서

**작성일**: 2026-03-12
**프로젝트**: 함께봄스타 (별들에게 물어봐)
**작성 근거**: Discord, Reddit, YouTube, Twitch, Discourse, 네이버카페, 아프리카TV 등 8개 플랫폼 리서치 + Metis 사전분석

---

## 목차

1. [Part 1: 개요 및 리서치 요약](#part-1-개요-및-리서치-요약)
2. [Part 2: 시스템 아키텍처](#part-2-시스템-아키텍처)
3. [Part 3: 데이터베이스 스키마 변경](#part-3-데이터베이스-스키마-변경)
4. [Part 4: API 엔드포인트 설계](#part-4-api-엔드포인트-설계)
5. [Part 5: 사이드바 및 라우팅 설계](#part-5-사이드바-및-라우팅-설계)
6. [Part 6: 페이지 상세 설계 — Phase 1](#part-6-페이지-상세-설계--phase-1)
7. [Part 7: 페이지 상세 설계 — Phase 2](#part-7-페이지-상세-설계--phase-2)
8. [Part 8: 페이지 상세 설계 — Phase 3](#part-8-페이지-상세-설계--phase-3)
9. [Part 9: 컴포넌트 및 검증 스키마 설계](#part-9-컴포넌트-및-검증-스키마-설계)
10. [Part 10: 구현 로드맵 및 커밋 전략](#part-10-구현-로드맵-및-커밋-전략)

---

# Part 1: 개요 및 리서치 요약

## 1.1 프로젝트 배경 및 목적

함께봄스타는 영상 제작 프리랜서(STAR)와 관리자(ADMIN)를 위한 의뢰-납품-피드백-정산 내부 플랫폼이다. 현재 커뮤니티 게시판, 영상 댓글, 포트폴리오 등 사용자 생성 콘텐츠(UGC)가 활발히 운영되고 있으나, 이를 관리할 어드민 도구가 전혀 없는 상태이다.

**현재 문제점**:
- 신고(Report)가 접수되어도 관리자가 확인할 UI가 없음
- 게시글/댓글의 숨김/삭제를 관리자가 직접 할 수 없음
- 악성 사용자를 제재(정지/차단)할 메커니즘이 없음
- 공지사항/FAQ API는 존재하지만 관리 페이지가 없음

**목표**: 신고 관리, 게시글/댓글 관리, 유저 제재, 공지사항/FAQ 관리 등 8개 관리자 페이지를 3단계로 구현하여 커뮤니티 운영에 필요한 모든 관리 도구를 제공한다.

## 1.2 리서치 요약

### Discord Trust & Safety
- 신고 접수 후 **즉시 자동 숨김** → 모더레이터 검토 → 복원 또는 영구 삭제
- 6단계 제재 단계: 경고 → 콘텐츠숨김 → 삭제 → 임시정지 → 영구정지 → 플랫폼추방
- 보고자에게 처리 결과 통보

### Reddit ModQueue
- 큐 기반 워크플로우: Needs Review / Reported / Removed / Edited / Unmoderated
- 사용자 프로필 패널: 큐를 떠나지 않고 사용자 이력 확인 (인라인 컨텍스트)
- 모더레이터 간 충돌 방지: 검토 중인 항목에 잠금 표시

### YouTube Studio
- 댓글 3단계 필터링: 자동 스팸 → 검토 보류 → 사용자 신고
- Strike 시스템: 경고(0) → 1주 제한(1) → 2주 제한(2) → 영구(3), 90일 후 자동 소멸
- 일괄 처리: 선택 항목 승인/삭제/사용자 차단

### Twitch AutoMod
- 4가지 카테고리 × 레벨 0-4 필터링 시스템
- 사용자 카드(User Card): 계정 생성일, 이전 타임아웃 횟수, 밴 이력, 최근 메시지, 빠른 액션
- 모더레이션 로그: 모든 액션 타임스탬프 기록

### Discourse
- 시스템 기본 플래그 6종 + 커스텀 플래그
- KPI: 플래그 해결 비율, 평균 해결 시간, 모더레이터별 처리 건수
- 일괄 처리: 삭제, 숨김, 스팸 표시, 사용자 정지, 카테고리 이동

### 한국 플랫폼 (네이버카페, 아프리카TV)
- 한국어 제재 용어: 주의, 경고, 활동정지(7일/30일), 영구정지, 정산제한
- 방통위 규정: 불법 콘텐츠 즉시 삭제 의무, 신고 처리 결과 통보 의무
- 신고 사유: 스팸/홍보, 욕설/비방, 음란물, 개인정보 노출, 저작권 침해, 기타

## 1.3 현재 시스템 분석

### 기존 인프라

| 기능 | 상태 | 위치 | 비고 |
|------|------|------|------|
| Report 모델 | ✅ 존재 | `schema.prisma:894-911` | PENDING/REVIEWED/RESOLVED/DISMISSED |
| Report POST/GET API | ✅ 존재 | `/api/reports/route.ts` | 자동숨김(5건+) 포함 |
| Report PATCH API | ✅ 존재 | `/api/reports/[id]/route.ts` | 상태만 변경 |
| BoardPost.isHidden/isPinned | ✅ 존재 | `schema:776-779` | 모든 필드 존재 |
| BoardComment.isHidden | ✅ 존재 | `schema:815` | 존재 |
| VideoComment.isHidden/isPinned | ✅ 존재 | `schema:711-712` | 마이그레이션 불필요 |
| AuditLog 모델 | ✅ 존재 | `schema:305-321` | 완전한 감사 추적 |
| AuditLog 관리 페이지 | ✅ 존재 | `/admin/logs` | 타임라인 뷰 + 필터 |
| FAQ 어드민 API | ✅ 완전 | `/api/admin/faq/*` | CRUD 전체 |
| Announcement API | ✅ 완전 | `/api/announcements/*` | CRUD + 읽음 추적 |
| User 제재 필드 | ❌ 없음 | — | ban/suspend 메커니즘 없음 |
| Admin Board Post API | ❌ 없음 | — | 유저 API만 존재 |
| Admin Comment API | ❌ 없음 | — | 유저 API만 존재 |
| 어드민 신고 관리 UI | ❌ 없음 | — | API만 존재 |

### 🔴 발견된 크리티컬 이슈 3건

**이슈 1: 자동숨김이 VIDEO/USER 타입 무시**
`/api/reports/route.ts`에서 5건 이상 신고 시 자동숨김 로직이 POST와 COMMENT만 처리한다. VIDEO 신고는 아무 동작도 안 하며, COMMENT 타입이 모호하다 (BoardComment만 시도하고 VideoComment는 `.catch(() => {})`로 무시).

**이슈 2: Report PATCH에 사이드이펙트 없음**
관리자가 신고를 '처리완료'로 변경해도 해당 콘텐츠가 숨겨지거나 사용자에게 제재가 적용되지 않는다. 상태 값만 변경된다.

**이슈 3: 유저 제재는 인증 아키텍처 변경 필요**
ban/suspension 기능은 단순 스키마 변경이 아니다. `getAuthUser()` (40+ 호출 사이트), 2개 레이아웃, 새 페이지(`/auth/banned`, `/auth/suspended`)까지 변경해야 한다.

## 1.4 구현 범위 및 제외 사항

### 포함 (8개 페이지, 3 Phase)

| Phase | 페이지 | 설명 |
|-------|--------|------|
| 1 | 신고 관리 `/admin/reports` | 신고 큐, 상세, 조치, 일괄처리 |
| 1 | 유저 제재 `/admin/sanctions` | 제재 목록, 이력, 수동 제재, 해제 |
| 2 | 게시글 관리 `/admin/board-posts` | 전체 게시글, 숨김/고정, 상세 |
| 2 | 댓글 관리 `/admin/comments` | 통합 댓글(게시판+영상), 숨김/삭제 |
| 3 | 공지사항 관리 `/admin/announcements` | CRUD, 공개/비공개, 상단고정 |
| 3 | FAQ 관리 `/admin/faq` | CRUD, 카테고리, 정렬 |

### 제외 (향후 Phase 4)
- 모더레이션 개요 대시보드 (KPI, 차트)
- AutoMod/키워드 필터 규칙 엔진
- 이의 신청(Appeal) 관리 페이지 (모델만 생성)
- 실시간 모더레이션 알림

---

# Part 2: 시스템 아키텍처

## 2.1 콘텐츠 생명주기

```
[콘텐츠 생성] (게시글/댓글/영상)
       ↓
[공개 상태] ← 사용자가 열람 가능
       ↓
[사용자 신고] → Report 생성 (PENDING)
       ↓
  ┌────┴────┐
  │  5건 미만 │  5건 이상
  │         │     ↓
  │    [자동 숨김] + Report PENDING 유지
  │         │
  └────┬────┘
       ↓
[관리자 검토] → Report → UNDER_REVIEW
       ↓
  ┌─────────┼──────────┐
[기각]    [조치]    [에스컬레이션]
  ↓          ↓           ↓
DISMISSED  RESOLVED    ESCALATED
           ↓
     [콘텐츠 숨김/삭제]
     [사용자 경고/정지/차단]
     [AuditLog 기록]
```

## 2.2 신고 상태 머신

기존 `ReportStatus`를 확장한다:

```
PENDING (접수 대기)
  → UNDER_REVIEW (검토 중) — 관리자가 열람 시
  → RESOLVED (처리 완료) — 조치 적용
  → DISMISSED (기각) — 위반 없음
  → ESCALATED (에스컬레이션) — 상위 관리자에게 이관
```

**기존 enum에서 변경점**: `REVIEWED` → `UNDER_REVIEW`로 의미 명확화, `ESCALATED` 추가

## 2.3 제재 단계 (Sanction Ladder)

| Level | 유형 | 설명 | 기간 |
|-------|------|------|------|
| 0 | WARNING | 경고 — 내부 기록, 사용자 통보(선택) | — |
| 1 | CONTENT_HIDDEN | 콘텐츠 숨김 — 해당 콘텐츠만 | — |
| 2 | CONTENT_REMOVED | 콘텐츠 삭제 — 영구 제거 | — |
| 3 | TEMP_RESTRICT | 임시 제한 — 게시/댓글 기능 제한, 열람 가능 | 1~30일 |
| 4 | TEMP_BAN | 임시 정지 — 플랫폼 접근 차단 | 1~90일 |
| 5 | PERM_BAN | 영구 정지 — 계정 영구 비활성화 | 무기한 |

## 2.4 기존 AuditLog 활용 방안

**Metis 지시사항**: 별도 ModerationLog 모델을 만들지 않는다. 기존 `AuditLog`에 모더레이션 액션 타입을 추가하여 사용한다.

```typescript
// AuditLog 활용 예시
await prisma.auditLog.create({
  data: {
    actorId: adminUser.id,
    action: "MODERATION_HIDE_POST",       // 접두사 MODERATION_ 사용
    entityType: "BoardPost",
    entityId: postId,
    changes: { isHidden: { from: false, to: true } },
    metadata: { reportId, reason: "스팸 게시물" },
  },
});
```

**모더레이션 액션 타입 목록** (AuditLog.action 값):
- `MODERATION_REPORT_RESOLVED` — 신고 처리 완료
- `MODERATION_REPORT_DISMISSED` — 신고 기각
- `MODERATION_REPORT_ESCALATED` — 신고 에스컬레이션
- `MODERATION_HIDE_POST` — 게시글 숨김
- `MODERATION_UNHIDE_POST` — 게시글 숨김 해제
- `MODERATION_HIDE_COMMENT` — 댓글 숨김
- `MODERATION_DELETE_COMMENT` — 댓글 삭제
- `MODERATION_WARN_USER` — 사용자 경고
- `MODERATION_RESTRICT_USER` — 사용자 임시 제한
- `MODERATION_SUSPEND_USER` — 사용자 임시 정지
- `MODERATION_BAN_USER` — 사용자 영구 정지
- `MODERATION_UNBAN_USER` — 정지 해제
- `MODERATION_REVOKE_SANCTION` — 제재 해제

기존 `/admin/logs` 페이지에서 action 필터에 `MODERATION_` 접두사로 모더레이션 로그만 필터링 가능하다.

## 2.5 인증 아키텍처 변경 사항

### getAuthUser() 변경

```typescript
// 현재 (auth-helpers.ts)
interface GetAuthUserOptions {
  skipApprovalCheck?: boolean;
}

// 변경 후
interface GetAuthUserOptions {
  skipApprovalCheck?: boolean;
  skipBanCheck?: boolean;      // 레이아웃에서 별도 처리 시 사용
}
```

**변경 로직**:
1. `getAuthUserCached()`로 User 조회 (변경 없음)
2. `suspendedUntil` 체크: `suspendedUntil && suspendedUntil > now()` → 정지 상태
3. `suspendedUntil && suspendedUntil <= now()` → 자동 해제 (`suspendedUntil = null`, `suspendedReason = null`)
4. `isBanned === true` → 차단 상태
5. `skipBanCheck: true`이면 위 체크 건너뜀

### 레이아웃 변경

```
(dashboard)/layout.tsx:
  getAuthUser({ skipApprovalCheck: true, skipBanCheck: true })
  → if (user.isBanned) → redirect("/auth/banned")          // 차단이 최우선
  → if (suspendedUntil > now()) → redirect("/auth/suspended")
  → if (!user.isApproved) → redirect("/auth/pending-approval")
  → if (user.role !== "STAR") → redirect("/admin")

(admin)/layout.tsx:
  getAuthUser({ skipApprovalCheck: true, skipBanCheck: true })
  → if (user.role !== "ADMIN") → redirect("/stars/dashboard")
  // ADMIN은 ban 체크하지 않음 (ADMIN은 ban할 수 없음)
```

### 신규 페이지

- `/auth/banned/page.tsx` — "계정이 영구 정지되었습니다" 안내, 로그아웃 버튼
- `/auth/suspended/page.tsx` — "계정이 임시 정지되었습니다. 해제일: {날짜}" 안내, 로그아웃 버튼

---

# Part 3: 데이터베이스 스키마 변경

## 3.1 User 모델 변경

```prisma
model User {
  // ... 기존 필드 유지 ...

  // 신규: 제재 관련 필드
  isBanned          Boolean   @default(false)
  bannedAt          DateTime?
  bannedReason      String?
  suspendedUntil    DateTime?
  suspendedReason   String?
  warningCount      Int       @default(0)

  // 신규: 관계
  sanctions         UserSanction[]  @relation("UserSanctions")
  appliedSanctions  UserSanction[]  @relation("AppliedSanctions")
  revokedSanctions  UserSanction[]  @relation("RevokedSanctions")
  appeals           Appeal[]        @relation("UserAppeals")
  reviewedAppeals   Appeal[]        @relation("ReviewedAppeals")

  // ... 기존 관계 유지 ...
}
```

**설계 결정**: `isSuspended Boolean`을 사용하지 않는다. 정지 상태는 `suspendedUntil > now()`로 파생한다. 이는 만료 시 별도 배치 작업 없이 `getAuthUser()`에서 자동 해제할 수 있어 stale state를 방지한다.

## 3.2 Report 모델 확장

```prisma
model Report {
  id               String         @id @default(cuid())
  reporterId       String
  targetType       ReportTarget
  targetId         String
  reason           ReportReason
  description      String?
  status           ReportStatus   @default(PENDING)
  priority         ReportPriority @default(MEDIUM)     // 신규
  resolutionAction String?                              // 신규: NO_ACTION, CONTENT_HIDDEN, USER_WARNED, USER_SUSPENDED, USER_BANNED
  resolutionNote   String?                              // 신규: 처리 메모
  resolvedBy       String?
  resolvedAt       DateTime?
  assignedTo       String?                              // 신규: 담당자 ID
  createdAt        DateTime       @default(now())

  reporter         User           @relation(fields: [reporterId], references: [id])
  sanctions        UserSanction[] @relation("ReportSanctions")

  @@index([targetType, targetId])
  @@index([status])
  @@index([status, priority])                           // 신규: 복합 인덱스
  @@index([assignedTo])                                 // 신규
  @@map("reports")
}

// 기존 enum 유지
enum ReportTarget {
  VIDEO
  COMMENT
  POST
  USER
}

// 기존 enum 유지
enum ReportReason {
  SPAM
  HARASSMENT
  INAPPROPRIATE
  COPYRIGHT
  OTHER
}

// 확장: REVIEWED → UNDER_REVIEW, ESCALATED 추가
enum ReportStatus {
  PENDING
  UNDER_REVIEW
  RESOLVED
  DISMISSED
  ESCALATED
}

// 신규 enum
enum ReportPriority {
  HIGH
  MEDIUM
  LOW
}
```

**마이그레이션 노트**: `REVIEWED` → `UNDER_REVIEW` enum 변경은 기존 데이터에 영향. 기존 REVIEWED 상태 레코드를 UNDER_REVIEW로 마이그레이션 스크립트 실행 필요.

## 3.3 신규 모델: UserSanction

```prisma
model UserSanction {
  id             String       @id @default(cuid())
  userId         String
  type           SanctionType
  reason         String
  internalNote   String?
  startAt        DateTime     @default(now())
  endAt          DateTime?    // null = 영구 또는 즉시
  isActive       Boolean      @default(true)
  appliedById    String
  revokedAt      DateTime?
  revokedById    String?
  revokeReason   String?
  reportId       String?      // 연관 신고 ID
  notifiedUser   Boolean      @default(false)
  createdAt      DateTime     @default(now())

  user           User         @relation("UserSanctions", fields: [userId], references: [id])
  appliedBy      User         @relation("AppliedSanctions", fields: [appliedById], references: [id])
  revokedBy      User?        @relation("RevokedSanctions", fields: [revokedById], references: [id])
  report         Report?      @relation("ReportSanctions", fields: [reportId], references: [id])
  appeals        Appeal[]     @relation("SanctionAppeals")

  @@index([userId, isActive])
  @@index([type])
  @@map("user_sanctions")
}

enum SanctionType {
  WARNING
  CONTENT_HIDDEN
  CONTENT_REMOVED
  TEMP_RESTRICT
  TEMP_BAN
  PERM_BAN
}
```

## 3.4 신규 모델: Appeal

```prisma
model Appeal {
  id            String        @id @default(cuid())
  userId        String
  sanctionId    String?
  reportId      String?
  reason        String        // 이의 신청 사유
  status        AppealStatus  @default(PENDING)
  reviewedById  String?
  reviewNote    String?
  resolvedAt    DateTime?
  createdAt     DateTime      @default(now())

  user          User          @relation("UserAppeals", fields: [userId], references: [id])
  sanction      UserSanction? @relation("SanctionAppeals", fields: [sanctionId], references: [id])
  reviewedBy    User?         @relation("ReviewedAppeals", fields: [reviewedById], references: [id])

  @@index([userId])
  @@index([status])
  @@map("appeals")
}

enum AppealStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
}
```

## 3.5 인덱스 전략

| 모델 | 인덱스 | 용도 |
|------|--------|------|
| Report | `[status, priority]` | 신고 큐 필터링 (상태 + 우선순위) |
| Report | `[assignedTo]` | 담당자별 조회 |
| UserSanction | `[userId, isActive]` | 사용자별 활성 제재 조회 |
| UserSanction | `[type]` | 제재 유형별 필터링 |
| Appeal | `[userId]` | 사용자별 이의 신청 |
| Appeal | `[status]` | 상태별 필터링 |

## 3.6 마이그레이션 계획

```bash
# Step 1: User 모델 필드 추가 (additive, 안전)
# Step 2: Report 모델 확장 (enum 변경 주의)
# Step 3: UserSanction 모델 생성
# Step 4: Appeal 모델 생성
# Step 5: prisma db push && pnpm db:generate
# Step 6: 기존 REVIEWED → UNDER_REVIEW 데이터 마이그레이션
```

---

# Part 4: API 엔드포인트 설계

## 4.1 Admin Report APIs

### GET /api/admin/reports — 신고 목록

```
인증: ADMIN only (getAuthUser() → role === "ADMIN")
쿼리 파라미터:
  - status?: ReportStatus (필터)
  - priority?: ReportPriority (필터)
  - targetType?: ReportTarget (필터)
  - reason?: ReportReason (필터)
  - assignedTo?: string | "unassigned" | "me" (필터)
  - search?: string (검색 — 콘텐츠 미리보기 텍스트)
  - page?: number (기본 1)
  - limit?: number (기본 20)
  - sort?: "createdAt" | "priority" | "reportCount" (기본 createdAt)
  - order?: "asc" | "desc" (기본 desc)

응답: {
  data: Report[] (reporter, 관련 콘텐츠 미리보기 포함),
  meta: { total, page, limit, statusCounts: Record<ReportStatus, number> }
}

에러:
  - 401: 미인증
  - 403: ADMIN 아님
```

### GET /api/admin/reports/[id] — 신고 상세

```
인증: ADMIN only
응답: {
  data: {
    report: Report (reporter, 콘텐츠 상세),
    targetContent: BoardPost | BoardComment | VideoComment | Video | User,
    reportedUser: User (활동 통계, 이전 제재 이력),
    relatedReports: Report[] (같은 targetId의 다른 신고들),
    reportCount: number (동일 대상 전체 신고 수)
  }
}
```

### PATCH /api/admin/reports/[id] — 신고 상태 업데이트

```
인증: ADMIN only
요청 본문:
  - status: ReportStatus
본문 (status === "UNDER_REVIEW" 시):
  - assignedTo?: string (자동으로 현재 admin ID 배정)
```

### POST /api/admin/reports/[id]/action — 신고 조치 (핵심 엔드포인트)

```
인증: ADMIN only
요청 본문: {
  actionType: "DISMISS" | "WARN" | "HIDE_CONTENT" | "REMOVE_CONTENT" | "RESTRICT" | "SUSPEND" | "BAN",
  duration?: number (일 단위, RESTRICT/SUSPEND 시 필수),
  reason: string (필수),
  internalNote?: string,
  notifyUser?: boolean (기본 true)
}

처리 로직 ($transaction):
  1. Report.status → RESOLVED 또는 DISMISSED
  2. Report.resolutionAction → 매핑된 값
  3. Report.resolvedBy → admin ID
  4. Report.resolvedAt → now()
  5. actionType에 따라:
     - DISMISS: 추가 작업 없음
     - WARN: User.warningCount++ + UserSanction(WARNING) 생성
     - HIDE_CONTENT: 해당 콘텐츠 isHidden = true + UserSanction(CONTENT_HIDDEN)
     - REMOVE_CONTENT: 해당 콘텐츠 삭제 + UserSanction(CONTENT_REMOVED)
     - RESTRICT: User.suspendedUntil 설정 + UserSanction(TEMP_RESTRICT)
     - SUSPEND: User.suspendedUntil 설정 + UserSanction(TEMP_BAN)
     - BAN: User.isBanned = true + UserSanction(PERM_BAN)
  6. AuditLog 기록
  7. 같은 targetId의 다른 PENDING 신고도 일괄 RESOLVED 처리

에러:
  - 400: 잘못된 actionType 또는 누락 필수 필드
  - 403: ADMIN 아님
  - 404: 신고 없음
  - 409: 이미 처리된 신고
```

### POST /api/admin/reports/[id]/assign — 담당자 배정

```
인증: ADMIN only
요청: { assignedTo: string }
처리: Report.assignedTo 업데이트, PENDING → UNDER_REVIEW 자동 전환
```

### POST /api/admin/reports/[id]/escalate — 에스컬레이션

```
인증: ADMIN only
요청: { reason: string }
처리: Report.status → ESCALATED, AuditLog 기록
```

### POST /api/admin/reports/bulk — 일괄 처리

```
인증: ADMIN only
요청: {
  reportIds: string[],
  action: "DISMISS" | "ASSIGN" | "ESCALATE",
  assignedTo?: string (ASSIGN 시 필수),
  reason?: string
}
```

## 4.2 Admin Sanction APIs

### GET /api/admin/sanctions — 제재 목록

```
인증: ADMIN only
쿼리:
  - type?: SanctionType
  - isActive?: boolean
  - userId?: string
  - page, limit, sort, order
응답: { data: UserSanction[], meta: { total, page, typeCounts } }
```

### POST /api/admin/sanctions — 수동 제재 생성

```
인증: ADMIN only
요청: {
  userId: string,
  type: SanctionType,
  reason: string,
  duration?: number (일 단위),
  internalNote?: string,
  notifyUser?: boolean
}
처리:
  1. ADMIN 사용자에 대한 제재 차단 (guard)
  2. UserSanction 생성
  3. type에 따라 User 필드 업데이트 (TEMP_BAN → suspendedUntil, PERM_BAN → isBanned)
  4. AuditLog 기록
```

### GET /api/admin/sanctions/[id] — 제재 상세

```
인증: ADMIN only
응답: { data: UserSanction (user, appliedBy, report, appeals 포함) }
```

### PATCH /api/admin/sanctions/[id]/revoke — 제재 해제

```
인증: ADMIN only
요청: { reason: string }
처리:
  1. UserSanction.isActive → false, revokedAt, revokedBy, revokeReason
  2. User 필드 복원 (isBanned → false, suspendedUntil → null)
  3. AuditLog 기록 (MODERATION_REVOKE_SANCTION)
```

## 4.3 Admin Board Post APIs

### GET /api/admin/board-posts — 게시글 목록

```
인증: ADMIN only
쿼리:
  - boardType?: BoardType (FREE, QNA, TIPS, SHOWCASE, RECRUITMENT, NOTICE)
  - isHidden?: boolean
  - isPinned?: boolean
  - isNotice?: boolean
  - isFeatured?: boolean
  - authorId?: string
  - search?: string (제목/내용 검색)
  - dateFrom, dateTo?: string
  - page, limit, sort, order
응답: {
  data: BoardPost[] (author, _count: { comments, likes, reports }),
  meta: { total, page, statusCounts }
}
```

### PATCH /api/admin/board-posts/[id] — 게시글 상태 변경

```
인증: ADMIN only
요청: {
  isHidden?: boolean,
  isPinned?: boolean,
  isNotice?: boolean,
  isFeatured?: boolean
}
처리: 필드 업데이트 + AuditLog 기록
```

### DELETE /api/admin/board-posts/[id] — 게시글 삭제

```
인증: ADMIN only
처리: 게시글 삭제 (cascade: 댓글, 좋아요, 북마크) + AuditLog
```

### POST /api/admin/board-posts/bulk — 일괄 처리

```
인증: ADMIN only
요청: {
  postIds: string[],
  action: "HIDE" | "UNHIDE" | "PIN" | "UNPIN" | "DELETE"
}
```

## 4.4 Admin Board Comment APIs

### GET /api/admin/board-comments — 게시판 댓글 목록

```
인증: ADMIN only
쿼리: isHidden, authorId, postId, search, dateFrom, dateTo, page, limit
응답: { data: BoardComment[] (author, post.title), meta }
```

### PATCH /api/admin/board-comments/[id] — 댓글 상태 변경

```
인증: ADMIN only
요청: { isHidden: boolean }
```

### DELETE /api/admin/board-comments/[id] — 댓글 삭제

```
인증: ADMIN only
```

### POST /api/admin/board-comments/bulk — 일괄 처리

```
요청: { commentIds: string[], action: "HIDE" | "UNHIDE" | "DELETE" }
```

## 4.5 Admin Video Comment APIs

### GET /api/admin/video-comments — 영상 댓글 목록

```
인증: ADMIN only
쿼리: isHidden, authorId, videoId, search, dateFrom, dateTo, page, limit
응답: { data: VideoComment[] (author, video.title), meta }
```

### PATCH /api/admin/video-comments/[id] — 댓글 상태 변경

```
요청: { isHidden?: boolean, isPinned?: boolean }
```

### DELETE /api/admin/video-comments/[id]

### POST /api/admin/video-comments/bulk

## 4.6 공지사항/FAQ 관리

공지사항과 FAQ는 **이미 완전한 CRUD API가 존재**한다. 관리 페이지만 구현하면 된다.

- 공지사항: `GET/POST /api/announcements`, `GET/PATCH/DELETE /api/announcements/[id]`
- FAQ: `GET/POST /api/admin/faq`, `GET/PUT/DELETE /api/admin/faq/[id]`

---

# Part 5: 사이드바 및 라우팅 설계

## 5.1 신규 사이드바 그룹: "커뮤니티"

```typescript
// src/lib/admin-nav.ts에 추가
{
  id: "community",
  label: "커뮤니티",
  icon: Shield,            // lucide-react
  color: "sky",
  children: [
    { href: "/admin/reports", label: "신고 관리", icon: Flag },
    { href: "/admin/board-posts", label: "게시글 관리", icon: FileText },
    { href: "/admin/comments", label: "댓글 관리", icon: MessageCircle },
    { href: "/admin/sanctions", label: "유저 제재", icon: UserX },
  ],
},
```

## 5.2 기존 "운영" 그룹 확장

```typescript
// 기존 operations.children에 추가
{ href: "/admin/announcements", label: "공지사항 관리", icon: Megaphone },
{ href: "/admin/faq", label: "FAQ 관리", icon: HelpCircle },
```

## 5.3 colorMap 추가

```typescript
sky: {
  bg: "bg-sky-500/8 dark:bg-sky-500/10",
  text: "text-sky-600 dark:text-sky-400",
  glow: "shadow-[0_0_12px_oklch(0.6_0.15_230/0.3)]",
  dot: "bg-sky-500",
  line: "border-sky-500/20 dark:border-sky-400/15",
},
```

---

# Part 6: 페이지 상세 설계 — Phase 1

## 6.1 신고 관리 페이지 `/admin/reports`

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ 신고 관리                                    [새로고침] [내보내기]│
├─────────────────────────────────────────────────────────────┤
│ 통계 카드 (4개)                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 접수 대기  │ │ 검토 중   │ │ 오늘 처리  │ │ 에스컬레이션│        │
│ │    47     │ │    12     │ │    89     │ │     3     │        │
│ │ +12 전일비 │ │ -3 전일비  │ │ +15 전일비 │ │ +1 전일비  │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ [전체 62] [접수대기 47] [검토중 12] [에스컬레이션 3]            │
├─────────────────────────────────────────────────────────────┤
│ 🔍 검색...    유형 ▼    우선순위 ▼    콘텐츠 ▼    날짜 ▼      │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ 우선순위 │ ID      │ 콘텐츠 미리보기     │ 유형   │ 상태  │
│   │          │         │                    │ 신고수 │ 날짜  │
├───┼──────────┼─────────┼────────────────────┼────────┼──────┤
│ ☐ │ 🔴 높음  │ #a1b2c3 │ "이 영상 사기임..." │ 괴롭힘  │ 대기  │
│   │          │         │ 📹 영상             │ 3건    │ 2시간전│
├───┼──────────┼─────────┼────────────────────┼────────┼──────┤
│ ☐ │ 🟡 보통  │ #d4e5f6 │ "포트폴리오 링크가..│ 스팸   │ 검토중│
│   │          │         │ 📝 게시글           │ 1건    │ 3시간전│
├───┼──────────┼─────────┼────────────────────┼────────┼──────┤
│ ☐ │ 🟢 낮음  │ #g7h8i9 │ "댓글 내용이..."    │ 부적절  │ 대기  │
│   │          │         │ 💬 댓글             │ 1건    │ 5시간전│
└───┴──────────┴─────────┴────────────────────┴────────┴──────┘
│ ◀ 이전  1  2  3  ...  12  다음 ▶          전체 47건, 20건/페이지│
└─────────────────────────────────────────────────────────────┘

[일괄 처리 플로팅 바] (체크박스 선택 시 나타남)
┌─────────────────────────────────────────────────────────────┐
│ 3건 선택됨  [일괄 기각] [일괄 배정 ▼] [일괄 에스컬레이션]  [취소]│
└─────────────────────────────────────────────────────────────┘
```

### 신고 상세 Sheet (행 클릭 시 우측 슬라이드)

```
┌──────────────────────────────────────────┐
│ 신고 #a1b2c3                      [✕ 닫기]│
├──────────────────────────────────────────┤
│ 상태: 🔴 접수 대기   우선순위: 높음        │
│ 신고 유형: 괴롭힘     신고 수: 3건         │
│ 접수일: 2026-03-12 14:30                 │
│ 담당자: 미배정                            │
├──────────────────────────────────────────┤
│ 📋 신고된 콘텐츠                          │
│ ┌────────────────────────────────────┐   │
│ │ 📹 영상: "2월 프로젝트 최종본"       │   │
│ │ 작성자: 김철수 (STAR)               │   │
│ │ 업로드: 2026-03-10                  │   │
│ │ [원본 보기 →]                       │   │
│ └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│ 👥 신고자 목록                            │
│ • user_A — 2시간 전 — "사기 영상입니다"   │
│ • user_B — 3시간 전 — "저작권 침해"       │
│ • user_C — 5시간 전                      │
├──────────────────────────────────────────┤
│ 👤 피신고자 정보                          │
│ 이름: 김철수    역할: STAR                │
│ 가입일: 2024-03-15                       │
│ 이전 신고: 2건  이전 제재: 1건            │
│ 경고 횟수: 1                             │
│ [전체 이력 보기 →]                        │
├──────────────────────────────────────────┤
│ ⚡ 조치                                   │
│ ○ 기각 (위반 없음)                        │
│ ○ 경고 발송                              │
│ ○ 콘텐츠 숨김                            │
│ ○ 콘텐츠 삭제                            │
│ ○ 임시 제한  기간: [7일 ▼]               │
│ ○ 임시 정지  기간: [7일 ▼]               │
│ ● 영구 정지                              │
│                                          │
│ 사유: [________________]                  │
│ 내부 메모: [________________]             │
│ ☑ 사용자에게 통보                         │
│                                          │
│ [조치 적용]  [에스컬레이션]               │
└──────────────────────────────────────────┘
```

### 컴포넌트 구조

```
src/app/(admin)/admin/reports/page.tsx (~1200줄)
  "use client"
  ├── useQuery("/api/admin/reports")
  ├── 통계 카드 4개 (Card + CardContent)
  ├── 필터 탭 (상태별 카운트)
  ├── 필터 바 (Select × 4 + Input 검색)
  ├── 데이터 테이블 (체크박스 + 컬럼)
  ├── 페이지네이션
  ├── 일괄 처리 플로팅 바 (framer-motion AnimatePresence)
  └── 상세 Sheet
      ├── 콘텐츠 미리보기
      ├── 신고자 목록
      ├── 피신고자 정보
      └── 조치 패널 (RadioGroup + Select + Textarea)
```

### 데이터 페칭 패턴

```typescript
// TanStack Query 사용 (기존 패턴 준수)
const { data, isLoading, refetch } = useQuery({
  queryKey: ["admin-reports", { status, priority, targetType, page }],
  queryFn: () => fetchReports({ status, priority, targetType, page }),
  staleTime: 30_000,
});

// 조치 적용 mutation
const actionMutation = useMutation({
  mutationFn: (params: ReportActionParams) =>
    fetch(`/api/admin/reports/${params.reportId}/action`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    toast.success("신고 처리가 완료되었습니다.");
  },
  onError: () => toast.error("처리 중 오류가 발생했습니다."),
});
```

## 6.2 유저 제재 관리 페이지 `/admin/sanctions`

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ 유저 제재 관리                               [수동 제재 추가]  │
├─────────────────────────────────────────────────────────────┤
│ [전체 28] [경고 15] [임시제한 5] [임시정지 6] [영구정지 2]     │
├─────────────────────────────────────────────────────────────┤
│ 🔍 사용자명/이메일 검색...                    상태 ▼   기간 ▼ │
├─────────────────────────────────────────────────────────────┤
│ 사용자       │ 제재 유형   │ 사유     │ 시작일   │ 종료일  │ 액션│
├──────────────┼────────────┼─────────┼─────────┼────────┼────┤
│ 👤 김철수     │ 🔴 임시정지 │ 반복 괴롭│ 03-10   │ 03-17  │ ⋮  │
│ star@ex.com  │ 7일        │ 힘      │         │ (D-5)  │    │
├──────────────┼────────────┼─────────┼─────────┼────────┼────┤
│ 👤 이영희     │ 🟡 임시제한 │ 스팸 게시│ 03-11   │ 03-14  │ ⋮  │
│ lee@ex.com   │ 3일        │ 물      │         │ (D-2)  │    │
├──────────────┼────────────┼─────────┼─────────┼────────┼────┤
│ 👤 박민수     │ 🔴 영구정지 │ 저작권  │ 03-08   │ —      │ ⋮  │
│ park@ex.com  │ 무기한     │ 반복침해 │         │        │    │
└──────────────┴────────────┴─────────┴─────────┴────────┴────┘

⋮ 드롭다운: [제재 해제] [이력 보기] [기간 연장]
```

### 제재 상세 Sheet

```
┌──────────────────────────────────────────┐
│ 김철수 제재 이력                    [✕ 닫기]│
├──────────────────────────────────────────┤
│ 👤 김철수 (STAR)                          │
│ 이메일: star@example.com                 │
│ 가입일: 2024-03-15                       │
│ 경고 횟수: 2                             │
├──────────────────────────────────────────┤
│ 🔴 현재 제재                              │
│ 유형: 임시 정지 7일                       │
│ 시작: 2026-03-10                         │
│ 종료: 2026-03-17 (D-5)                   │
│ 사유: 반복적인 괴롭힘 행위                  │
│ 처리자: admin@example.com                │
│ [조기 해제] [기간 연장] [영구 정지 전환]    │
├──────────────────────────────────────────┤
│ 📋 제재 이력 타임라인                      │
│ ●─ 2026-03-10 임시 정지 7일              │
│ │  사유: 반복 괴롭힘  처리: admin          │
│ │  관련 신고: #a1b2c3                     │
│ ●─ 2026-02-15 경고                       │
│ │  사유: 스팸 게시물  처리: mod            │
│ ●─ 2026-01-20 콘텐츠 삭제                │
│    사유: 부적절 댓글  처리: admin          │
├──────────────────────────────────────────┤
│ 📩 이의 신청                              │
│ 상태: 접수 대기                           │
│ 신청일: 2026-03-11                       │
│ 사유: "의도하지 않은 행위였습니다..."       │
└──────────────────────────────────────────┘
```

### 수동 제재 추가 다이얼로그

```typescript
interface ManualSanctionForm {
  userId: string;           // 사용자 선택 (검색 가능 Select)
  type: SanctionType;       // 제재 유형
  reason: string;           // 사유 (필수)
  duration?: number;        // 기간 (일) — TEMP_RESTRICT/TEMP_BAN 시
  internalNote?: string;    // 내부 메모
  notifyUser: boolean;      // 사용자 통보 여부
}
```

## 6.3 인증 변경 상세

### getAuthUser() 변경 코드

```typescript
// src/lib/auth-helpers.ts
interface GetAuthUserOptions {
  skipApprovalCheck?: boolean;
  skipBanCheck?: boolean;
}

const getAuthUserCached = cache(async () => {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser?.id) return null;
  return prisma.user.findUnique({ where: { authId: authUser.id } });
});

export async function getAuthUser(options?: GetAuthUserOptions) {
  const user = await getAuthUserCached();
  if (!user) return null;

  // Ban/Suspend 체크 (skipBanCheck가 아닌 경우)
  if (!options?.skipBanCheck) {
    // 영구 정지 체크
    if (user.isBanned) return null;

    // 임시 정지 체크
    if (user.suspendedUntil) {
      if (user.suspendedUntil > new Date()) {
        return null; // 아직 정지 중
      }
      // 만료됨 → 자동 해제
      await prisma.user.update({
        where: { id: user.id },
        data: { suspendedUntil: null, suspendedReason: null },
      });
    }
  }

  // 승인 체크
  if (!options?.skipApprovalCheck && !user.isApproved) {
    return null;
  }

  return user;
}
```

### /auth/banned/page.tsx

```
┌─────────────────────────────────────────┐
│                                         │
│           🚫 계정 영구 정지              │
│                                         │
│   회원님의 계정이 영구 정지되었습니다.     │
│                                         │
│   정지 사유: {bannedReason}              │
│   정지일: {bannedAt}                     │
│                                         │
│   이의가 있으시면 고객센터로 문의해주세요.  │
│   support@hamkkebom.com                 │
│                                         │
│           [로그아웃]                      │
│                                         │
└─────────────────────────────────────────┘
```

### /auth/suspended/page.tsx

```
┌─────────────────────────────────────────┐
│                                         │
│           ⏸️ 계정 임시 정지              │
│                                         │
│   회원님의 계정이 임시 정지되었습니다.     │
│                                         │
│   정지 사유: {suspendedReason}           │
│   해제 예정일: {suspendedUntil}          │
│   남은 기간: D-{days}                    │
│                                         │
│   정지가 해제되면 자동으로 접속 가능합니다. │
│                                         │
│           [로그아웃]                      │
│                                         │
└─────────────────────────────────────────┘
```

---

# Part 7: 페이지 상세 설계 — Phase 2

## 7.1 게시글 관리 페이지 `/admin/board-posts`

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ 게시글 관리                                                  │
├─────────────────────────────────────────────────────────────┤
│ 통계 카드 (4개)                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 전체 게시글│ │ 숨김 상태  │ │ 공지사항   │ │ 오늘 작성  │        │
│ │   1,247  │ │    15     │ │    8     │ │    23    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ 게시판: [전체▼] [자유▼] [Q&A▼] [팁▼] [쇼케이스▼] [구인▼] [공지▼]│
├─────────────────────────────────────────────────────────────┤
│ 🔍 제목/내용 검색...   상태 ▼   작성자 ▼   날짜 ▼   정렬 ▼   │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ 제목                 │ 게시판 │ 작성자  │ 상태         │ 조회│
│   │                      │        │        │              │ 댓글│
│   │                      │        │        │              │ 좋아요│
├───┼──────────────────────┼────────┼────────┼──────────────┼────┤
│ ☐ │ 2월 프로젝트 후기      │ 자유   │ 김철수  │ 📌고정 ⚡추천  │ 342│
│   │                      │        │        │              │ 15 │
│   │                      │        │        │              │ 28 │
├───┼──────────────────────┼────────┼────────┼──────────────┼────┤
│ ☐ │ [숨김] 스팸 게시물     │ 자유   │ 이영희  │ 🚫숨김 ⚠신고2건│ 5  │
│   │                      │        │        │              │ 0  │
│   │                      │        │        │              │ 0  │
└───┴──────────────────────┴────────┴────────┴──────────────┴────┘
│ ◀  1  2  3  ...  ▶                               1,247건 전체│
└─────────────────────────────────────────────────────────────┘

[일괄 처리 플로팅 바]
┌─────────────────────────────────────────────────────────────┐
│ 5건 선택  [숨김] [숨김해제] [고정] [고정해제] [삭제]    [취소]  │
└─────────────────────────────────────────────────────────────┘
```

### 게시글 상세 Sheet

```
┌──────────────────────────────────────────┐
│ 게시글 상세                        [✕ 닫기]│
├──────────────────────────────────────────┤
│ 📝 2월 프로젝트 후기                       │
│ 게시판: 자유   작성자: 김철수 (STAR)        │
│ 작성일: 2026-03-12 10:30                 │
│ 조회: 342  댓글: 15  좋아요: 28           │
├──────────────────────────────────────────┤
│ 상태 배지                                │
│ [📌 고정] [⚡ 추천] [✅ 공개]              │
│                                          │
│ 빠른 액션:                               │
│ [숨김/해제] [고정/해제] [공지/해제]         │
│ [추천/해제] [삭제]                        │
├──────────────────────────────────────────┤
│ 📄 내용 미리보기                          │
│ ┌────────────────────────────────────┐   │
│ │ 이번 달 프로젝트를 진행하면서...      │   │
│ │ 많은 것을 배웠습니다. 특히...        │   │
│ │ (최대 500자 미리보기)               │   │
│ │ [전체 보기 →]                       │   │
│ └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│ 💬 최근 댓글 (15개 중 5개 표시)            │
│ • user_A: "좋은 후기 감사합니다!"  2h전   │
│ • user_B: "저도 비슷한 경험..."    3h전   │
│ [전체 댓글 관리 →]                        │
├──────────────────────────────────────────┤
│ ⚠️ 신고 이력 (2건)                        │
│ • #a1b2c3 — 스팸 (PENDING) — 1h전       │
│ • #d4e5f6 — 부적절 (DISMISSED) — 1d전   │
│ [신고 관리 →]                             │
└──────────────────────────────────────────┘
```

### 컴포넌트 구조

```
src/app/(admin)/admin/board-posts/page.tsx (~1000줄)
  "use client"
  ├── useQuery("/api/admin/board-posts")
  ├── 통계 카드 4개
  ├── 게시판 유형 필터 탭 (BoardType 6종 + 전체)
  ├── 검색 + 필터 바 (상태, 작성자, 날짜)
  ├── 데이터 테이블 (체크박스, 상태 배지 조합)
  ├── 페이지네이션
  ├── 일괄 처리 플로팅 바
  └── 상세 Sheet
      ├── 게시글 정보 + 빠른 액션
      ├── 내용 미리보기
      ├── 최근 댓글
      └── 신고 이력
```

## 7.2 댓글 관리 페이지 `/admin/comments`

### 아키텍처 결정: 통합 뷰

`BoardComment`와 `VideoComment`는 별도 Prisma 모델이지만, 관리자 UI에서는 **통합된 하나의 테이블**로 표시한다. 내부적으로 두 개의 병렬 API 호출 후 클라이언트에서 병합한다.

```typescript
// 댓글 통합 뷰 데이터 페칭
const boardComments = useQuery({
  queryKey: ["admin-board-comments", filters],
  queryFn: () => fetchBoardComments(filters),
  enabled: commentType !== "video",
});

const videoComments = useQuery({
  queryKey: ["admin-video-comments", filters],
  queryFn: () => fetchVideoComments(filters),
  enabled: commentType !== "board",
});

// 클라이언트 병합 + 정렬
const mergedComments = useMemo(() => {
  const all = [
    ...(boardComments.data?.data ?? []).map(c => ({ ...c, sourceType: "board" as const })),
    ...(videoComments.data?.data ?? []).map(c => ({ ...c, sourceType: "video" as const })),
  ];
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}, [boardComments.data, videoComments.data]);
```

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ 댓글 관리                                                    │
├─────────────────────────────────────────────────────────────┤
│ [전체] [게시판 댓글 520] [영상 댓글 340]                       │
├─────────────────────────────────────────────────────────────┤
│ 🔍 내용 검색...   상태 ▼   작성자 ▼   날짜 ▼                  │
├─────────────────────────────────────────────────────────────┤
│ ☐ │ 내용 미리보기          │ 유형  │ 원본      │ 작성자 │ 상태│
│   │                       │       │          │       │ 날짜│
├───┼───────────────────────┼───────┼──────────┼───────┼────┤
│ ☐ │ "좋은 영상이네요! 다..."│ 📹영상│ 2월 최종본│ 김철수 │ 공개│
│   │                       │       │          │       │ 2h전│
├───┼───────────────────────┼───────┼──────────┼───────┼────┤
│ ☐ │ [숨김] "스팸 링크..."  │ 📝게시│ 자유게시판│ 이영희 │ 숨김│
│   │                       │ 판    │ #1234    │       │ 3h전│
├───┼───────────────────────┼───────┼──────────┼───────┼────┤
│ ☐ │ "감사합니다! 정말..."  │ 📹영상│ 3월 작업물│ 박민수 │ 공개│
│   │                       │       │          │       │ 5h전│
└───┴───────────────────────┴───────┴──────────┴───────┴────┘

[일괄 처리 플로팅 바]
┌─────────────────────────────────────────────────────────────┐
│ 3건 선택  [숨김] [숨김해제] [삭제]                     [취소]  │
└─────────────────────────────────────────────────────────────┘
```

### 댓글 상세 Sheet

```
┌──────────────────────────────────────────┐
│ 댓글 상세                          [✕ 닫기]│
├──────────────────────────────────────────┤
│ 💬 댓글 원문                              │
│ ┌────────────────────────────────────┐   │
│ │ "좋은 영상이네요! 다음에도 이런     │   │
│ │  프로젝트 기대합니다."              │   │
│ └────────────────────────────────────┘   │
│ 작성자: 김철수   유형: 📹 영상 댓글       │
│ 작성일: 2026-03-12 14:30                 │
│ 좋아요: 5  답글: 2                       │
│ 상태: [✅ 공개]                           │
├──────────────────────────────────────────┤
│ 📎 원본 컨텍스트                          │
│ ┌────────────────────────────────────┐   │
│ │ 📹 "2월 프로젝트 최종본"            │   │
│ │ 업로드: 김철수 (STAR)               │   │
│ │ [원본 보기 →]                       │   │
│ └────────────────────────────────────┘   │
├──────────────────────────────────────────┤
│ 👤 작성자 정보                            │
│ 이름: 김철수   역할: STAR                 │
│ 경고: 0   제재: 0                        │
├──────────────────────────────────────────┤
│ ⚡ 빠른 액션                              │
│ [숨김/해제] [삭제] [작성자 경고]           │
└──────────────────────────────────────────┘
```

### 일괄 처리 주의사항

일괄 숨김/삭제 시 댓글의 `sourceType`에 따라 다른 API를 호출해야 한다:

```typescript
const handleBulkAction = async (action: "HIDE" | "UNHIDE" | "DELETE") => {
  const boardIds = selectedComments.filter(c => c.sourceType === "board").map(c => c.id);
  const videoIds = selectedComments.filter(c => c.sourceType === "video").map(c => c.id);

  const promises = [];
  if (boardIds.length > 0) {
    promises.push(fetch("/api/admin/board-comments/bulk", {
      method: "POST",
      body: JSON.stringify({ commentIds: boardIds, action }),
    }));
  }
  if (videoIds.length > 0) {
    promises.push(fetch("/api/admin/video-comments/bulk", {
      method: "POST",
      body: JSON.stringify({ commentIds: videoIds, action }),
    }));
  }
  await Promise.all(promises);
};
```

---

# Part 8: 페이지 상세 설계 — Phase 3

## 8.1 공지사항 관리 페이지 `/admin/announcements`

기존 `/api/announcements` API가 완전한 CRUD를 제공하므로 페이지만 구현한다.

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ 공지사항 관리                                  [새 공지 작성]  │
├─────────────────────────────────────────────────────────────┤
│ [전체 24] [공개 20] [비공개 4]                                │
├─────────────────────────────────────────────────────────────┤
│ 🔍 제목 검색...                              카테고리 ▼       │
├─────────────────────────────────────────────────────────────┤
│ 제목                    │ 카테고리 │ 상태    │ 작성일   │ 액션 │
├─────────────────────────┼─────────┼────────┼─────────┼─────┤
│ 📌 3월 정산 안내          │ 정산    │ ✅ 공개 │ 03-10   │ ⋮   │
├─────────────────────────┼─────────┼────────┼─────────┼─────┤
│ 서비스 점검 안내          │ 시스템  │ ✅ 공개 │ 03-08   │ ⋮   │
├─────────────────────────┼─────────┼────────┼─────────┼─────┤
│ [비공개] 테스트 공지       │ 기타   │ ❌ 비공개│ 03-05   │ ⋮   │
└─────────────────────────┴─────────┴────────┴─────────┴─────┘

⋮ 드롭다운: [수정] [공개/비공개 전환] [상단 고정/해제] [삭제]
```

### 공지 작성/수정 Dialog

```
┌──────────────────────────────────────────┐
│ 공지사항 작성                       [✕ 닫기]│
├──────────────────────────────────────────┤
│ 제목: [________________________]          │
│ 카테고리: [정산 ▼]                        │
│ 내용:                                    │
│ ┌────────────────────────────────────┐   │
│ │                                    │   │
│ │  (Textarea, 최소 5줄)              │   │
│ │                                    │   │
│ └────────────────────────────────────┘   │
│ ☑ 즉시 공개   ☐ 상단 고정                │
│                                          │
│           [취소] [저장]                    │
└──────────────────────────────────────────┘
```

### API 연동

```typescript
// 목록 조회
useQuery({ queryKey: ["admin-announcements"], queryFn: () => fetch("/api/announcements") });

// 생성
useMutation({ mutationFn: (data) => fetch("/api/announcements", { method: "POST", body: JSON.stringify(data) }) });

// 수정
useMutation({ mutationFn: ({ id, data }) => fetch(`/api/announcements/${id}`, { method: "PATCH", body: JSON.stringify(data) }) });

// 삭제
useMutation({ mutationFn: (id) => fetch(`/api/announcements/${id}`, { method: "DELETE" }) });
```

## 8.2 FAQ 관리 페이지 `/admin/faq`

기존 `/api/admin/faq` API가 완전한 CRUD + sortOrder를 제공한다.

### 와이어프레임

```
┌─────────────────────────────────────────────────────────────┐
│ FAQ 관리                                       [새 FAQ 추가]  │
├─────────────────────────────────────────────────────────────┤
│ 카테고리: [전체 ▼]  🔍 질문 검색...                           │
├─────────────────────────────────────────────────────────────┤
│ 📂 일반 (5개)                                               │
│ ├── ≡ Q: 함께봄스타는 어떤 서비스인가요?           [수정] [삭제]│
│ ├── ≡ Q: 가입은 어떻게 하나요?                    [수정] [삭제]│
│ └── ≡ Q: STAR 승인은 얼마나 걸리나요?             [수정] [삭제]│
│                                                             │
│ 📂 프로젝트 (3개)                                            │
│ ├── ≡ Q: 프로젝트 참여 방법은?                    [수정] [삭제]│
│ └── ≡ Q: 동시에 여러 프로젝트 참여가 가능한가요?    [수정] [삭제]│
│                                                             │
│ 📂 정산 (4개)                                               │
│ ├── ≡ Q: 정산은 언제 이루어지나요?                 [수정] [삭제]│
│ └── ≡ Q: 정산 금액은 어떻게 계산되나요?             [수정] [삭제]│
└─────────────────────────────────────────────────────────────┘

≡ = 드래그 핸들 (sortOrder 변경)
```

### FAQ 작성/수정 Dialog

```
┌──────────────────────────────────────────┐
│ FAQ 추가                           [✕ 닫기]│
├──────────────────────────────────────────┤
│ 카테고리: [일반 ▼]                        │
│ 질문: [________________________]          │
│ 답변:                                    │
│ ┌────────────────────────────────────┐   │
│ │                                    │   │
│ │  (Textarea)                        │   │
│ │                                    │   │
│ └────────────────────────────────────┘   │
│                                          │
│           [취소] [저장]                    │
└──────────────────────────────────────────┘
```

### 드래그 정렬

```typescript
// @dnd-kit/core 또는 기존 라이브러리 활용
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const newOrder = arrayMove(items, oldIndex, newIndex).map((item, i) => ({
    id: item.id,
    sortOrder: i,
  }));

  // 낙관적 업데이트
  setItems(reordered);

  // API 호출
  await fetch("/api/admin/faq/reorder", {
    method: "PUT",
    body: JSON.stringify({ items: newOrder }),
  });
};
```

---

# Part 9: 컴포넌트 및 검증 스키마 설계

## 9.1 신규 컴포넌트 트리

```
src/components/moderation/
├── report-status-badge.tsx       # ReportStatus 배지 (색상 매핑)
├── report-priority-badge.tsx     # ReportPriority 배지
├── report-reason-badge.tsx       # ReportReason 배지 (한국어 라벨)
├── sanction-type-badge.tsx       # SanctionType 배지
├── content-type-icon.tsx         # ReportTarget → 아이콘 매핑
├── moderation-action-panel.tsx   # 신고 조치 패널 (RadioGroup + Select)
├── user-moderation-card.tsx      # 사용자 모더레이션 정보 카드
├── sanction-timeline.tsx         # 제재 이력 타임라인
└── content-preview.tsx           # 콘텐츠 미리보기 (타입별 렌더링)
```

## 9.2 상태 배지 매핑

```typescript
// report-status-badge.tsx
const statusMap: Record<ReportStatus, { label: string; variant: string }> = {
  PENDING: { label: "접수 대기", variant: "default" },
  UNDER_REVIEW: { label: "검토 중", variant: "secondary" },
  RESOLVED: { label: "처리 완료", variant: "outline" },
  DISMISSED: { label: "기각", variant: "outline" },
  ESCALATED: { label: "에스컬레이션", variant: "destructive" },
};

// report-priority-badge.tsx
const priorityMap: Record<ReportPriority, { label: string; color: string }> = {
  HIGH: { label: "높음", color: "text-red-600 dark:text-red-400" },
  MEDIUM: { label: "보통", color: "text-yellow-600 dark:text-yellow-400" },
  LOW: { label: "낮음", color: "text-green-600 dark:text-green-400" },
};

// report-reason-badge.tsx
const reasonMap: Record<ReportReason, string> = {
  SPAM: "스팸/홍보",
  HARASSMENT: "괴롭힘/비방",
  INAPPROPRIATE: "부적절한 콘텐츠",
  COPYRIGHT: "저작권 침해",
  OTHER: "기타",
};

// sanction-type-badge.tsx
const sanctionMap: Record<SanctionType, { label: string; color: string }> = {
  WARNING: { label: "경고", color: "text-yellow-600" },
  CONTENT_HIDDEN: { label: "콘텐츠 숨김", color: "text-orange-600" },
  CONTENT_REMOVED: { label: "콘텐츠 삭제", color: "text-orange-600" },
  TEMP_RESTRICT: { label: "임시 제한", color: "text-red-500" },
  TEMP_BAN: { label: "임시 정지", color: "text-red-600" },
  PERM_BAN: { label: "영구 정지", color: "text-red-700" },
};
```

## 9.3 Zod 검증 스키마

```typescript
// src/lib/validations/moderation.ts
import { z } from "zod";

// 신고 조치
export const reportActionSchema = z.object({
  actionType: z.enum([
    "DISMISS", "WARN", "HIDE_CONTENT", "REMOVE_CONTENT",
    "RESTRICT", "SUSPEND", "BAN",
  ], { message: "유효하지 않은 조치 유형입니다." }),
  duration: z.number().int().min(1).max(365).optional(),
  reason: z.string().trim().min(2, "사유는 2자 이상이어야 합니다.").max(500),
  internalNote: z.string().trim().max(1000).optional(),
  notifyUser: z.boolean().default(true),
}).refine(
  (data) => {
    if (["RESTRICT", "SUSPEND"].includes(data.actionType)) {
      return data.duration !== undefined && data.duration > 0;
    }
    return true;
  },
  { message: "임시 제한/정지 시 기간을 입력해야 합니다.", path: ["duration"] }
);

// 수동 제재
export const manualSanctionSchema = z.object({
  userId: z.string().min(1, "사용자를 선택해야 합니다."),
  type: z.enum([
    "WARNING", "CONTENT_HIDDEN", "CONTENT_REMOVED",
    "TEMP_RESTRICT", "TEMP_BAN", "PERM_BAN",
  ], { message: "유효하지 않은 제재 유형입니다." }),
  reason: z.string().trim().min(2, "사유는 2자 이상이어야 합니다.").max(500),
  duration: z.number().int().min(1).max(365).optional(),
  internalNote: z.string().trim().max(1000).optional(),
  notifyUser: z.boolean().default(true),
});

// 신고 일괄 처리
export const reportBulkActionSchema = z.object({
  reportIds: z.array(z.string()).min(1, "최소 1개의 신고를 선택해야 합니다."),
  action: z.enum(["DISMISS", "ASSIGN", "ESCALATE"]),
  assignedTo: z.string().optional(),
  reason: z.string().trim().max(500).optional(),
});

// 게시글 상태 변경
export const boardPostUpdateSchema = z.object({
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  isNotice: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// 게시글 일괄 처리
export const boardPostBulkSchema = z.object({
  postIds: z.array(z.string()).min(1),
  action: z.enum(["HIDE", "UNHIDE", "PIN", "UNPIN", "DELETE"]),
});

// 댓글 일괄 처리
export const commentBulkSchema = z.object({
  commentIds: z.array(z.string()).min(1),
  action: z.enum(["HIDE", "UNHIDE", "DELETE"]),
});

export type ReportActionInput = z.infer<typeof reportActionSchema>;
export type ManualSanctionInput = z.infer<typeof manualSanctionSchema>;
export type ReportBulkActionInput = z.infer<typeof reportBulkActionSchema>;
export type BoardPostUpdateInput = z.infer<typeof boardPostUpdateSchema>;
export type BoardPostBulkInput = z.infer<typeof boardPostBulkSchema>;
export type CommentBulkInput = z.infer<typeof commentBulkSchema>;
```

## 9.4 TypeScript 타입 확장

```typescript
// src/types/database.ts에 추가
export type { UserSanction, Appeal, SanctionType, AppealStatus } from "@/generated/prisma";

// src/types/api.ts에 추가
export interface AdminReportDetail {
  report: Report & { reporter: Pick<User, "id" | "name" | "email"> };
  targetContent: BoardPost | BoardComment | VideoComment | Video | User | null;
  reportedUser: User & {
    _count: { boardPosts: number; boardComments: number; videoComments: number };
    sanctions: UserSanction[];
  };
  relatedReports: Report[];
  reportCount: number;
}

export interface AdminSanctionWithRelations extends UserSanction {
  user: Pick<User, "id" | "name" | "email" | "avatarUrl" | "role">;
  appliedBy: Pick<User, "id" | "name">;
  revokedBy?: Pick<User, "id" | "name"> | null;
  report?: Pick<Report, "id" | "targetType" | "reason"> | null;
  appeals: Appeal[];
}

export interface MergedComment {
  id: string;
  content: string;
  authorId: string;
  author: Pick<User, "id" | "name" | "email" | "avatarUrl">;
  isHidden: boolean;
  likeCount: number;
  createdAt: string;
  sourceType: "board" | "video";
  parentTitle: string;       // 게시글 제목 또는 영상 제목
  parentId: string;          // postId 또는 videoId
  reportCount: number;
}
```

---

# Part 10: 구현 로드맵 및 커밋 전략

## 10.1 Phase 1: Foundation (~2-3일, 8 커밋)

| # | 커밋 | TDD | 범위 |
|---|------|-----|------|
| 1 | `schema: add user sanction fields, UserSanction, Appeal models, extend Report` | — | `prisma/schema.prisma` + `pnpm db:generate` |
| 2 | `test: add getAuthUser ban/suspension test cases (RED)` | ✅ RED | `src/__tests__/api/auth-helpers-ban.test.ts` |
| 3 | `feat: add ban/suspension checks to getAuthUser` | ✅ GREEN | `src/lib/auth-helpers.ts` |
| 4 | `feat: add banned/suspended pages and layout guards` | — | `/auth/banned/page.tsx`, `/auth/suspended/page.tsx`, 레이아웃 변경 |
| 5 | `test: add report resolution with side-effects tests (RED)` | ✅ RED | `src/__tests__/api/reports-action.test.ts` |
| 6 | `feat: rewrite report action API with side effects, fix auto-hide bug` | ✅ GREEN | `/api/admin/reports/[id]/action/route.ts`, `/api/reports/route.ts` 수정 |
| 7 | `feat: add admin sanctions APIs with tests` | ✅ | `/api/admin/sanctions/route.ts`, 테스트 |
| 8 | `feat: add community sidebar group, report management page, sanctions page` | — | `admin-nav.ts`, `/admin/reports/page.tsx`, `/admin/sanctions/page.tsx` |

### 검증 기준

```bash
# 커밋 1 후
pnpm db:generate  # 에러 0

# 커밋 3 후
pnpm vitest run src/__tests__/api/auth-helpers-ban.test.ts  # 전체 통과

# 커밋 6 후
pnpm vitest run src/__tests__/api/reports-action.test.ts    # 전체 통과

# 커밋 8 후
pnpm build        # 에러 0
pnpm test         # 기존 + 신규 테스트 전체 통과
```

## 10.2 Phase 2: Content Moderation (~2일, 6 커밋)

| # | 커밋 | 범위 |
|---|------|------|
| 9 | `test: add admin board-posts API tests (RED)` | `src/__tests__/api/admin-board-posts.test.ts` |
| 10 | `feat: add admin board-posts and board-comments APIs` | `/api/admin/board-posts/route.ts`, `/api/admin/board-comments/route.ts` |
| 11 | `feat: add admin video-comments API` | `/api/admin/video-comments/route.ts` |
| 12 | `feat: add board post management page` | `/admin/board-posts/page.tsx` |
| 13 | `feat: add unified comment management page` | `/admin/comments/page.tsx` |
| 14 | `feat: add moderation validation schemas and shared components` | `validations/moderation.ts`, `components/moderation/` |

### 검증 기준

```bash
pnpm build        # 에러 0
pnpm test         # 전체 통과
# LSP diagnostics: 변경된 모든 파일 에러 0
```

## 10.3 Phase 3: Content Publishing (~1일, 4 커밋)

| # | 커밋 | 범위 |
|---|------|------|
| 15 | `feat: add announcement management page` | `/admin/announcements/page.tsx` |
| 16 | `feat: add FAQ management page with drag sort` | `/admin/faq/page.tsx` |
| 17 | `test: add announcement and FAQ page component tests` | 컴포넌트 테스트 |
| 18 | `docs: update AGENTS.md with new admin pages and APIs` | AGENTS.md 업데이트 |

### 검증 기준

```bash
pnpm build        # 에러 0
pnpm test         # 전체 통과 (기존 280건 + 신규)
```

## 10.4 전체 QA 시나리오

### 신고 플로우

1. 사용자가 게시글 신고 → Report(PENDING) 생성 확인
2. 5건 이상 신고 → 자동 숨김 동작 확인 (BoardPost, BoardComment, VideoComment 모두)
3. 관리자가 /admin/reports에서 신고 확인 → 필터/검색 동작
4. 신고 상세 → 콘텐츠 미리보기 + 피신고자 정보 표시
5. "콘텐츠 숨김" 조치 → 콘텐츠 isHidden=true, Report RESOLVED, AuditLog 기록 확인
6. 같은 대상의 다른 PENDING 신고도 일괄 RESOLVED 확인

### 제재 플로우

1. 관리자가 사용자 7일 정지 → UserSanction 생성, User.suspendedUntil 설정 확인
2. 정지된 사용자 로그인 시도 → /auth/suspended 리다이렉트 확인
3. 7일 경과 후 → getAuthUser에서 자동 해제, 정상 접근 확인
4. 영구 정지 → isBanned=true, /auth/banned 리다이렉트 확인
5. 제재 해제 → UserSanction.isActive=false, User 필드 복원, AuditLog 기록 확인
6. ADMIN 사용자 제재 시도 → 403 에러 확인

### 게시글/댓글 관리 플로우

1. /admin/board-posts에서 게시판 유형별 필터 동작 확인
2. 게시글 숨김 → isHidden=true, AuditLog 기록 확인
3. 일괄 삭제 → 댓글/좋아요 cascade 삭제 확인
4. /admin/comments에서 통합 뷰 (게시판+영상 댓글) 표시 확인
5. 댓글 유형 필터 전환 시 올바른 데이터 로드 확인

### 공지사항/FAQ 플로우

1. 공지사항 생성 → /api/announcements POST 호출 확인
2. 공지사항 수정/삭제 → PATCH/DELETE 동작 확인
3. FAQ 생성 → /api/admin/faq POST 호출 확인
4. FAQ 드래그 정렬 → sortOrder 업데이트 확인

---

## 부록: 파일 변경 목록 (전체)

### 신규 생성 파일

```
prisma/schema.prisma                                    (수정)
src/lib/auth-helpers.ts                                 (수정)
src/lib/admin-nav.ts                                    (수정)
src/lib/validations/moderation.ts                       (신규)
src/app/(admin)/admin/reports/page.tsx                   (신규, ~1200줄)
src/app/(admin)/admin/sanctions/page.tsx                 (신규, ~800줄)
src/app/(admin)/admin/board-posts/page.tsx               (신규, ~1000줄)
src/app/(admin)/admin/comments/page.tsx                  (신규, ~800줄)
src/app/(admin)/admin/announcements/page.tsx             (신규, ~600줄)
src/app/(admin)/admin/faq/page.tsx                       (신규, ~500줄)
src/app/auth/banned/page.tsx                             (신규, ~60줄)
src/app/auth/suspended/page.tsx                          (신규, ~80줄)
src/app/api/admin/reports/route.ts                       (신규)
src/app/api/admin/reports/[id]/route.ts                  (신규)
src/app/api/admin/reports/[id]/action/route.ts           (신규)
src/app/api/admin/reports/[id]/assign/route.ts           (신규)
src/app/api/admin/reports/[id]/escalate/route.ts         (신규)
src/app/api/admin/reports/bulk/route.ts                  (신규)
src/app/api/admin/sanctions/route.ts                     (신규)
src/app/api/admin/sanctions/[id]/route.ts                (신규)
src/app/api/admin/sanctions/[id]/revoke/route.ts         (신규)
src/app/api/admin/board-posts/route.ts                   (신규)
src/app/api/admin/board-posts/[id]/route.ts              (신규)
src/app/api/admin/board-posts/bulk/route.ts              (신규)
src/app/api/admin/board-comments/route.ts                (신규)
src/app/api/admin/board-comments/[id]/route.ts           (신규)
src/app/api/admin/board-comments/bulk/route.ts           (신규)
src/app/api/admin/video-comments/route.ts                (신규)
src/app/api/admin/video-comments/[id]/route.ts           (신규)
src/app/api/admin/video-comments/bulk/route.ts           (신규)
src/components/moderation/report-status-badge.tsx         (신규)
src/components/moderation/report-priority-badge.tsx       (신규)
src/components/moderation/report-reason-badge.tsx         (신규)
src/components/moderation/sanction-type-badge.tsx         (신규)
src/components/moderation/content-type-icon.tsx           (신규)
src/components/moderation/moderation-action-panel.tsx     (신규)
src/components/moderation/user-moderation-card.tsx        (신규)
src/components/moderation/sanction-timeline.tsx           (신규)
src/components/moderation/content-preview.tsx             (신규)
src/__tests__/api/auth-helpers-ban.test.ts               (신규)
src/__tests__/api/reports-action.test.ts                 (신규)
src/__tests__/api/admin-board-posts.test.ts              (신규)
src/__tests__/components/report-management.test.tsx       (신규)
src/app/(dashboard)/layout.tsx                           (수정)
src/app/(admin)/layout.tsx                               (수정)
src/app/api/reports/route.ts                             (수정: 자동숨김 버그 수정)
```

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | User 필드 6개 추가, Report 필드 4개 추가, UserSanction 모델, Appeal 모델, enum 3개 |
| `src/lib/auth-helpers.ts` | skipBanCheck 옵션, ban/suspend 체크 로직, 자동 해제 로직 |
| `src/lib/admin-nav.ts` | "커뮤니티" 그룹 추가, "운영" 그룹에 공지/FAQ 추가, sky colorMap |
| `src/app/(dashboard)/layout.tsx` | ban → suspended → isApproved 순서 체크 |
| `src/app/(admin)/layout.tsx` | ADMIN은 ban 체크 안 함 확인 |
| `src/app/api/reports/route.ts` | 자동숨김: VIDEO, VideoComment 지원 추가 |

---

**총 신규 파일**: 44개
**총 수정 파일**: 6개
**예상 코드량**: ~8,000줄 (페이지 6개 + API 30개 + 컴포넌트 9개 + 테스트 4개)
**예상 구현 기간**: 5-6일 (Phase 1: 2-3일, Phase 2: 2일, Phase 3: 1일)
