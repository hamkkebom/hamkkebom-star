# API ROUTES

42개 엔드포인트. 도메인별 route.ts 파일. 모든 라우트 동일 패턴 준수.

## ROUTE PATTERN (모든 라우트 필수)

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { someSchema } from "@/lib/validations/{domain}";

export async function POST(request: Request) {
  // 1. 인증
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  // 2. 권한 (role 체크)
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 3. 요청 파싱
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  // 4. 검증 (Zod)
  const parsed = someSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  // 5. DB 작업 (Prisma)
  const result = await prisma.model.create({ data: { ... } });

  // 6. 응답
  return NextResponse.json({ data: result }, { status: 201 });
}
```

## RESPONSE FORMAT

성공: `{ data: T }` 또는 `{ data: T[], total, page, pageSize, totalPages }`
실패: `{ error: { code: string, message: string } }`

| Status | Code | 사용처 |
|--------|------|--------|
| 200 | — | GET, PATCH 성공 |
| 201 | — | POST 생성 성공 |
| 400 | BAD_REQUEST, VALIDATION_ERROR | 파싱/검증 실패 |
| 401 | UNAUTHORIZED | getAuthUser() null |
| 403 | FORBIDDEN | role 불일치 |
| 404 | NOT_FOUND | findUnique null |
| 409 | CONFLICT, SLOT_OCCUPIED | 중복, 정원 초과 |
| 500 | INTERNAL_ERROR | 예외 |

## PAGINATION (목록 엔드포인트)

```typescript
const url = new URL(request.url);
const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")));
const skip = (page - 1) * pageSize;

const [items, total] = await Promise.all([
  prisma.model.findMany({ where, skip, take: pageSize, orderBy }),
  prisma.model.count({ where }),
]);

return NextResponse.json({
  data: items,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
});
```

## ENDPOINT MAP

### Users
- `GET/PATCH /api/users/me` — 내 프로필 (⚠️ bypass 중)

### Admin
- `GET /api/admin/users` — 유저 목록 (검색, 승인 필터, 페이지네이션)
- `PATCH /api/admin/users/[id]/approve` — 유저 승인
- `GET /api/admin/stars` — STAR 목록
- `GET /api/admin/stars/[id]` — STAR 상세

### Projects
- `POST/GET /api/projects/requests` — 제작요청 CRUD (POST=ADMIN only)
- `GET /api/projects/requests/board` — 게시판 뷰
- `GET/PATCH/DELETE /api/projects/requests/[id]` — 요청 상세
- `POST /api/projects/requests/[id]/accept` — STAR 수락 → ProjectAssignment 생성
- `GET /api/projects/my-assignments` — 내 배정 목록

### Submissions
- `POST/GET /api/submissions` — 제출 (POST=STAR, GET=ADMIN paginated)
- `GET /api/submissions/my` — 내 제출물
- `GET/PATCH/DELETE /api/submissions/[id]` — 제출물 상세
- `PATCH /api/submissions/[id]/approve` — 승인 (→ assignment COMPLETED)
- `PATCH /api/submissions/[id]/reject` — 반려
- `POST /api/submissions/upload-url` — CF Stream tus URL 발급

### Videos
- `GET /api/videos` — 영상 목록 (공개: APPROVED/FINAL only, ADMIN: 전체)
- `GET /api/videos/search` — 검색
- `POST /api/videos/sync` — CF Stream 동기화
- `GET/PATCH/DELETE /api/videos/[id]` — 영상 상세
- `GET /api/videos/[id]/preview` — 미리보기 URL
- `PATCH /api/videos/[id]/replace` — 영상 교체
- `POST /api/videos/upload-url` — CF Stream tus URL 발급

### Feedback
- `POST/GET /api/feedbacks` — 피드백 (POST=ADMIN, GET=role별 필터)
- `GET/PATCH/DELETE /api/feedback/[id]` — 피드백 상세
- `GET /api/feedback` — 레거시 (submissionId 쿼리)

### Portfolios
- `GET/PATCH /api/portfolios/me` — 내 포트폴리오
- `POST/GET /api/portfolios/me/items` — 항목 CRUD
- `GET/PATCH/DELETE /api/portfolios/me/items/[itemId]` — 항목 상세
- `POST /api/portfolios/me/items/reorder` — 순서 변경
- `GET /api/portfolios/user/[userId]` — 공개 포트폴리오

### Settlements
- `GET /api/settlements` — 정산 목록 (ADMIN: 전체, STAR: 본인)
- `GET/PATCH /api/settlements/[id]` — 정산 상세
- `PATCH /api/settlements/[id]/items/[itemId]` — 항목 금액 조정
- `PATCH /api/settlements/[id]/complete` — 정산 완료 처리
- `POST /api/settlements/generate` — 월별 정산 자동 생성

### Notifications
- `GET /api/notifications` — 알림 목록
- `GET /api/notifications/badge` — role별 뱃지 카운트

### Other
- `GET /api/categories` — 카테고리 목록
- `GET /api/stars` — STAR 목록 (공개)
- `GET /api/stars/[id]` — STAR 프로필
- `GET /api/health` — 헬스체크

## CONVENTIONS

- 모든 에러 메시지 **한국어**
- Zod schema는 `src/lib/validations/{domain}.ts`에서 import
- `$transaction` 사용: 다단계 작업 (예: 수락 시 assignment 생성 + request 상태 변경)
- `include` + `_count`: 연관 데이터 eager loading
- 검색: `{ contains: search, mode: "insensitive" }`
- 정렬: `orderBy: { createdAt: "desc" }` 기본

## ANTI-PATTERNS

- role 체크 없이 데이터 반환 금지
- try/catch 없이 request.json() 호출 금지
- Zod 검증 없이 body 사용 금지
- 직접 SQL 실행 금지 → Prisma만 사용
- 응답에 내부 에러 스택 노출 금지
