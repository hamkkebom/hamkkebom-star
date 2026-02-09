# API Routes 설계

> Next.js App Router API Routes. 모든 Route는 `/api/` 하위.
> 인증: Supabase Auth 세션 기반 (미들웨어에서 세션 체크).
> 역할 체크: 각 Route Handler에서 `user.role` 확인.

## 공통 응답 형식

### 성공

```json
{
  "data": { ... },
  "meta": { "page": 1, "pageSize": 20, "total": 100 }  // 목록 조회 시
}
```

### 에러

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다."
  }
}
```

### 공통 에러 코드

| HTTP | 코드 | 설명 |
|------|------|------|
| 400 | `BAD_REQUEST` | 유효성 검증 실패 (Zod) |
| 401 | `UNAUTHORIZED` | 인증 안 됨 |
| 403 | `FORBIDDEN` | 권한 없음 (역할 불일치) |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 중복 (이미 수락, 이미 존재 등) |
| 500 | `INTERNAL_ERROR` | 서버 에러 |

---

## 1. 제작요청 (Projects)

### GET `/api/projects/requests/board`

제작요청 게시판 목록.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |
| Query | `?page=1&pageSize=20&status=OPEN&search=검색어` |

**응답**:
```json
{
  "data": [
    {
      "id": "clx...",
      "title": "신제품 홍보 영상",
      "categories": ["브랜드", "홍보"],
      "deadline": "2026-03-15T00:00:00Z",
      "assignmentType": "MULTIPLE",
      "maxAssignees": 3,
      "currentAssignees": 1,
      "estimatedBudget": "500000",
      "status": "OPEN",
      "createdBy": { "id": "...", "name": "관리자" },
      "createdAt": "2026-02-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 15 }
}
```

### POST `/api/projects/requests`

제작요청 생성.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |
| Validation | Zod `projectRequestSchema` |

**요청 Body**:
```json
{
  "title": "신제품 홍보 영상",
  "categories": ["브랜드", "홍보"],
  "deadline": "2026-03-15T00:00:00Z",
  "assignmentType": "MULTIPLE",
  "maxAssignees": 3,
  "estimatedBudget": 500000,
  "requirements": "30초 이내, 밝은 톤",
  "referenceUrls": ["https://youtube.com/watch?v=xxx"]
}
```

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 403 | `FORBIDDEN` | STAR가 요청 시 |

### GET `/api/projects/requests/:id`

제작요청 상세.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

**응답**: 단일 ProjectRequest + assignments 목록 포함.

### POST `/api/projects/requests/:id/accept`

STAR가 제작요청 수락.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |
| Body | 없음 |

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 403 | `FORBIDDEN` | ADMIN이 수락 시 |
| 409 | `CONFLICT` | 이미 수락한 STAR |
| 409 | `REQUEST_FULL` | 정원 초과 |
| 404 | `NOT_FOUND` | 존재하지 않는 요청 |

### PATCH `/api/projects/requests/:id`

제작요청 수정.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |
| Body | `title`, `deadline`, `requirements` 등 (부분 업데이트) |

### DELETE `/api/projects/requests/:id`

제작요청 삭제.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 409 | `HAS_ASSIGNMENTS` | 이미 수락된 건이 있을 때 |

### GET `/api/projects/my-assignments`

내가 수락한 요청 목록.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |
| Query | `?status=IN_PROGRESS&page=1&pageSize=20` |

---

## 2. 제출물 (Submissions)

### POST `/api/submissions/upload-url`

Cloudflare Stream tus 업로드 URL 발급.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

**요청 Body**:
```json
{
  "maxDurationSeconds": 600
}
```

**응답**:
```json
{
  "data": {
    "uploadUrl": "https://upload.videodelivery.net/xxx",
    "uid": "stream-uid-xxx"
  }
}
```

### POST `/api/submissions`

제출물 생성 (업로드 완료 후).

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

**요청 Body**:
```json
{
  "assignmentId": "clx...",
  "versionSlot": 1,
  "versionTitle": "경쾌한 톤",
  "streamUid": "stream-uid-xxx"
}
```

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 409 | `SLOT_OCCUPIED` | 해당 슬롯+버전이 이미 존재 |
| 400 | `INVALID_SLOT` | versionSlot 1~5 범위 초과 |

### GET `/api/submissions/my`

내 제출물 목록.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |
| Query | `?assignmentId=xxx&status=PENDING` |

### GET `/api/submissions`

전체 제출물 목록 (ADMIN).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |
| Query | `?requestId=xxx&starId=xxx&status=PENDING&page=1&pageSize=20` |

### GET `/api/submissions/:id`

제출물 상세.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR(본인) |

**응답**: Submission + feedbacks[] + assignment 정보 포함.

### PATCH `/api/submissions/:id`

제출물 수정 (메타데이터).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR(본인) |
| Body | `versionTitle` 등 |

### PATCH `/api/submissions/:id/approve`

제출물 승인.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |
| Body | 없음 |

**사이드 이펙트**:
- Submission.status → `APPROVED`
- Assignment.status → `COMPLETED`
- Video 레코드 자동 생성 (승인된 영상 → 영상 자산으로 등록)
- SettlementItem 생성 대기 (월말 정산 시 포함)

### PATCH `/api/submissions/:id/reject`

제출물 반려.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**요청 Body**:
```json
{
  "reason": "색감 수정 필요"
}
```

---

## 3. 피드백 (Feedback)

### POST `/api/feedback`

피드백 작성.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**요청 Body**:
```json
{
  "submissionId": "clx...",
  "type": "CUT_EDIT",
  "priority": "HIGH",
  "content": "0:15~0:20 구간 전환이 어색합니다",
  "startTime": 15.0,
  "endTime": 20.0,
  "annotation": { "objects": [...] }
}
```

### GET `/api/feedback?submissionId=xxx`

제출물별 피드백 목록.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR(본인 제출물) |

### GET `/api/feedback/:id`

피드백 상세.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR(본인 제출물) |

### PATCH `/api/feedback/:id`

피드백 수정.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN (작성자 본인만) |
| Body | `content`, `priority`, `status`, `annotation` 등 |

### DELETE `/api/feedback/:id`

피드백 삭제.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN (작성자 본인만) |

---

## 4. 영상 (Videos)

### GET `/api/videos`

영상 목록 (브라우저).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |
| Query | `?page=1&pageSize=20&categoryId=xxx&ownerId=xxx&sort=latest&search=키워드` |

### GET `/api/videos/:id`

영상 상세.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

**응답**: Video + technicalSpec + eventLogs 포함.

### GET `/api/videos/:id/preview`

Cloudflare Stream signed URL 발급.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

**응답**:
```json
{
  "data": {
    "signedUrl": "https://customer-xxx.cloudflarestream.com/eyJ.../manifest/video.m3u8",
    "expiresAt": "2026-02-07T15:00:00Z"
  }
}
```

### GET `/api/videos/search?q=키워드`

키워드 검색.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |
| 구현 | PostgreSQL `tsvector` + `tsquery` full-text search |

### PATCH `/api/videos/:id`

메타데이터 수정 (제목, 설명, 카테고리, 썸네일).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN(전체), STAR(본인) |

**요청 Body**:
```json
{
  "title": "수정된 제목",
  "description": "새 설명",
  "categoryId": "clx...",
  "thumbnailUrl": "https://..."
}
```

### POST `/api/videos/:id/replace`

영상 파일 교체.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN(전체), STAR(본인) |

**응답**: 새 tus 업로드 URL 반환. 업로드 완료 시 기존 Stream UID 교체.

```json
{
  "data": {
    "uploadUrl": "https://upload.videodelivery.net/xxx",
    "newStreamUid": "new-uid-xxx"
  }
}
```

### POST `/api/videos/upload-url`

새 영상 업로드 URL 발급.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

### POST `/api/videos/sync`

Cloudflare Stream ↔ DB 동기화.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

---

## 5. 정산 (Settlements)

### POST `/api/settlements/generate`

월별 정산 일괄 생성.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**요청 Body**:
```json
{
  "year": 2026,
  "month": 1
}
```

**로직**:
1. 해당 월에 승인(APPROVED)된 Submission 조회
2. STAR별로 그룹핑
3. 각 STAR의 baseRate 조회
4. Settlement + SettlementItem[] 생성
5. totalAmount = sum(finalAmount)

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 409 | `ALREADY_GENERATED` | 해당 연월 정산이 이미 존재 |

### GET `/api/settlements`

정산 목록.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN(전체), STAR(본인) |
| Query | `?year=2026&month=1&status=PENDING&page=1&pageSize=20` |

### GET `/api/settlements/:id`

정산 상세 (항목 목록 포함).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR(본인) |

**응답**:
```json
{
  "data": {
    "id": "clx...",
    "star": { "id": "...", "name": "홍길동", "baseRate": "300000" },
    "year": 2026,
    "month": 1,
    "totalAmount": "1500000",
    "status": "PENDING",
    "items": [
      {
        "id": "clx...",
        "submission": { "id": "...", "versionTitle": "경쾌한 톤" },
        "baseAmount": "300000",
        "adjustedAmount": null,
        "finalAmount": "300000"
      },
      {
        "id": "clx...",
        "submission": { "id": "...", "versionTitle": "차분한 톤" },
        "baseAmount": "300000",
        "adjustedAmount": "500000",
        "finalAmount": "500000"
      }
    ]
  }
}
```

### PATCH `/api/settlements/:id/items/:itemId`

건별 금액 조정.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**요청 Body**:
```json
{
  "adjustedAmount": 500000
}
```

**사이드 이펙트**: Settlement.totalAmount 재계산.

### PATCH `/api/settlements/:id/complete`

정산 확정.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**에러**:
| HTTP | 코드 | 조건 |
|------|------|------|
| 409 | `ALREADY_COMPLETED` | 이미 확정된 정산 |

---

## 6. 포트폴리오 (Portfolios)

### GET `/api/portfolios/me`

내 포트폴리오 조회 (없으면 자동 생성).

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

### PATCH `/api/portfolios/me`

포트폴리오 프로필 수정.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |
| Body | `bio`, `showreel`, `website`, `socialLinks` |

### POST `/api/portfolios/me/items`

포트폴리오 항목 추가.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

**요청 Body**:
```json
{
  "title": "브랜드 홍보 영상",
  "description": "2026년 1월 제작",
  "thumbnailUrl": "https://...",
  "videoUrl": "https://..."
}
```

### PATCH `/api/portfolios/me/items/:itemId`

항목 수정.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

### DELETE `/api/portfolios/me/items/:itemId`

항목 삭제.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

### PATCH `/api/portfolios/me/items/reorder`

항목 순서 변경.

| 항목 | 값 |
|------|-----|
| 권한 | STAR |

**요청 Body**:
```json
{
  "orderedIds": ["clx1", "clx3", "clx2"]
}
```

### GET `/api/portfolios/user/:userId`

특정 유저 포트폴리오 조회.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

---

## 7. 사용자 (Users)

### GET `/api/users/me`

내 프로필 조회.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

### PATCH `/api/users/me`

프로필 수정.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |
| Body | `name`, `phone`, `avatarUrl` |

> 비밀번호 변경은 Supabase Auth `supabase.auth.updateUser({ password })` 클라이언트에서 직접 처리.

---

## 8. 관리자 (Admin)

### GET `/api/admin/stars`

STAR 회원 목록.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |
| Query | `?search=이름&page=1&pageSize=20` |

### GET `/api/admin/stars/:id`

STAR 상세 (프로필 + 단가 + 프로젝트 이력 + 정산 요약).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

### PATCH `/api/admin/stars/:id`

STAR 정보 수정 (기본 단가 설정 등).

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN |

**요청 Body**:
```json
{
  "baseRate": 350000
}
```

---

## 9. 알림 뱃지

### GET `/api/notifications/badge`

알림 뱃지 카운트.

| 항목 | 값 |
|------|-----|
| 권한 | ADMIN, STAR |

**응답 (STAR)**:
```json
{
  "data": {
    "unreadFeedbacks": 3
  }
}
```

**응답 (ADMIN)**:
```json
{
  "data": {
    "unreviewedSubmissions": 5,
    "pendingSettlements": 2
  }
}
```

**구현**: Submission/Feedback/Settlement 테이블에서 직접 COUNT 쿼리. 별도 모델 불필요.

---

## 10. 시스템

### GET `/api/health`

헬스체크.

| 항목 | 값 |
|------|-----|
| 권한 | 공개 |

**응답**:
```json
{
  "status": "ok",
  "timestamp": "2026-02-07T14:00:00Z"
}
```
