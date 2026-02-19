# 프로젝트 에러 분석 보고서

**분석일:** 2026-02-19
**프로젝트:** hamkkebom-star (별들에게 물어봐)
**분석 대상:** Build, TypeScript, ESLint, Vitest

---

## 요약

| 항목 | 결과 | 상세 |
|------|------|------|
| **Build** (`pnpm build`) | ✅ 성공 | Prisma generate + Next.js build 정상 (63 routes) |
| **TypeScript** (`tsc --noEmit`) | ❌ 14 에러 | 테스트 파일에만 존재 (소스코드 0 에러) |
| **ESLint** (`pnpm lint`) | ❌ 25 에러 / 54 경고 | `no-explicit-any` 14건, React 규칙 위반 6건 등 |
| **Vitest** (`pnpm test`) | ❌ 10/23 실패 | 9개 컴포넌트 테스트 + 1개 API 테스트 |

**근본 원인은 12개로 분류됨.** 표면적 에러 79건(25 error + 54 warning)이 실제로는 12개의 패턴에서 발생.

---

## 근본 원인 분석 (Root Cause Analysis)

### 🔴 원인 1: `@testing-library/dom` peer dependency 미설치

**영향 범위:** TypeScript 에러 9건 + 테스트 실패 9 suites (전체 에러의 ~40%)

**증상:**
- 컴포넌트 테스트 9개 전부 `Cannot find module '@testing-library/dom'`으로 로드 자체가 실패
- TypeScript에서 `screen` export를 찾을 수 없다는 TS2305 에러 9건

**원인 분석:**
`@testing-library/react@16.x`는 `@testing-library/dom`을 **peer dependency**로 선언함. pnpm은 npm/yarn과 달리 peer dependency를 자동 설치하지 않는 strict 모드가 기본. 결과적으로:

```
node_modules/@testing-library/
├── jest-dom     ✅ (package.json에 명시)
├── react        ✅ (package.json에 명시)
├── user-event   ✅ (package.json에 명시)
└── dom          ❌ (peer dependency이지만 명시되지 않아 미설치)
```

`@testing-library/react`의 내부 코드(`pure.js`)가 `require('@testing-library/dom')`을 호출하는 순간 모듈을 찾지 못해 전체 컴포넌트 테스트가 로드 단계에서 실패.

**해결 방법:**
```bash
pnpm add -D @testing-library/dom
```

한 줄로 9개 테스트 suite + 9개 TypeScript 에러 동시 해결.

---

### 🔴 원인 2: `videos-api.test.ts` mock에 `VideoSubject` enum 누락

**영향 범위:** 테스트 실패 1 suite

**증상:**
```
Error: No "VideoSubject" export is defined on the "@/generated/prisma/client" mock.
```

**원인 분석:**
`src/app/api/videos/route.ts`의 2번째 줄에서 `VideoStatus`와 `VideoSubject`를 **함께** import:

```typescript
import { VideoStatus, VideoSubject } from "@/generated/prisma/client";
```

그런데 테스트 파일의 mock은 `VideoStatus`만 정의하고 `VideoSubject`는 빠짐:

```typescript
vi.mock("@/generated/prisma/client", () => ({
  VideoStatus: { PENDING: "PENDING", ... },
  // ← VideoSubject가 없음!
}));
```

이 테스트는 원래 `VideoSubject` 추가 전에 작성된 것으로, route.ts에 `VideoSubject` 필터링이 추가되면서 mock이 업데이트되지 않은 것.

**해결 방법:**
```typescript
vi.mock("@/generated/prisma/client", () => ({
  VideoStatus: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    APPROVED: "APPROVED",
    FINAL: "FINAL",
    ARCHIVED: "ARCHIVED",
  },
  VideoSubject: {         // ← 추가
    COUNSELOR: "COUNSELOR",
    BRAND: "BRAND",
    OTHER: "OTHER",
  },
}));
```

---

### 🔴 원인 3: Prisma `JsonValue` 타입 불일치 → `as any` 캐스케이드

**영향 범위:** ESLint `no-explicit-any` 에러 8건 (14건 중 8건)

**증상:**
```typescript
// trigger.ts:63-65, analyze/route.ts:133-135 — 동일한 패턴 2곳에서 반복
scores: result.scores as any,
todoItems: result.todoItems as any,
insights: result.insights as any,
```

**원인 분석:**
Prisma schema에서 AI 분석 결과를 `Json` 타입으로 저장:
```prisma
model AiAnalysis {
  scores      Json?
  todoItems   Json?
  insights    Json?
}
```

`analyzeVideo()`가 반환하는 `AiAnalysisResult` 타입의 `scores`, `todoItems`, `insights`는 구조화된 객체 (예: `{ composition: number, lighting: number }`)지만, Prisma가 기대하는 타입은 `Prisma.InputJsonValue`.

TypeScript가 이 둘의 호환성을 보장하지 못하기 때문에 `as any`로 강제 변환한 것.

**이 패턴이 2곳에서 동일하게 반복되는 이유:**
- `src/lib/ai/trigger.ts` — fire-and-forget 백그라운드 트리거
- `src/app/api/ai/analyze/route.ts` — 수동 API 호출

두 파일이 동일한 "Gemini 결과 → AiAnalysis DB 저장" 로직을 중복으로 갖고 있음.

**해결 방법:**
```typescript
import { Prisma } from "@/generated/prisma/client";

// 방법 A: Prisma.InputJsonValue로 명시적 캐스팅
scores: result.scores as Prisma.InputJsonValue,
todoItems: result.todoItems as Prisma.InputJsonValue,
insights: result.insights as Prisma.InputJsonValue,

// 방법 B (권장): 저장 로직을 공통 함수로 추출하여 중복 제거
async function saveAnalysisResult(analysisId: string, result: AiAnalysisResult) {
  return prisma.aiAnalysis.update({
    where: { id: analysisId },
    data: {
      status: "DONE",
      summary: result.summary,
      scores: result.scores as Prisma.InputJsonValue,
      todoItems: result.todoItems as Prisma.InputJsonValue,
      insights: result.insights as Prisma.InputJsonValue,
      model: isGeminiConfigured() ? "gemini-2.0-flash-lite" : "mock",
    },
  });
}
```

**추가 — catch 블록의 `any`:**
```typescript
// trigger.ts:71, analyze/route.ts:143
} catch (err: any) {
```

이것도 같은 파일의 에러 핸들링. `unknown` + 타입 가드로 변경:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[AI Auto] 분석 실패 (${submissionId}):`, message);
}
```

---

### 🔴 원인 4: `<select>` onChange 이벤트의 string → union 타입 변환에 `as any` 사용

**영향 범위:** ESLint `no-explicit-any` 에러 3건

**증상:**
```typescript
// upload-client.tsx:560
onChange={(e) => setVideoSubject(e.target.value as any)}

// video-manager-client.tsx:447
onChange={(e) => setVideoSubject(e.target.value as any)}

// unified-feedback-list.tsx:256
onValueChange={(v) => setFilterSource(v as any)}
```

**원인 분석:**
HTML `<select>` 요소의 `onChange` 이벤트에서 `e.target.value`는 항상 `string`. 하지만 state는 특정 union 타입 (예: `"COUNSELOR" | "BRAND" | "OTHER"`)으로 선언됨. `string` → union 변환이 직접 안 되므로 `as any` 사용.

**해결 방법:**
```typescript
// Prisma enum 사용 시 — 정확한 타입으로 캐스팅
import { VideoSubject } from "@/generated/prisma/client";
onChange={(e) => setVideoSubject(e.target.value as VideoSubject)}

// 로컬 union 타입 사용 시
type FilterSource = "ALL" | "AI" | "HUMAN";
onValueChange={(v) => setFilterSource(v as FilterSource)}
```

---

### 🔴 원인 5: `statusMap` 아이콘 타입에 `any` 사용

**영향 범위:** ESLint `no-explicit-any` 에러 2건

**증상:**
```typescript
// submission-list.tsx:69
const statusMap: Record<SubmissionStatus, { label: string; className: string; icon: any }> = { ... };

// submission-detail-client.tsx:68
const statusMap: Record<SubmissionStatus, { label: string; className: string; icon: any; glowColor: string }> = { ... };
```

**원인 분석:**
lucide-react의 아이콘 컴포넌트 타입(`LucideIcon`)을 모르거나 import하지 않아서 `any`로 선언. 각 status에 `Loader2`, `PlayCircle`, `CheckCircle2` 등의 아이콘을 매핑하는데, 이 컴포넌트들의 공통 타입이 필요.

**해결 방법:**
```typescript
import { type LucideIcon } from "lucide-react";

const statusMap: Record<SubmissionStatus, {
  label: string;
  className: string;
  icon: LucideIcon;        // ← any → LucideIcon
  glowColor?: string;
}> = { ... };
```

---

### 🔴 원인 6: 드롭 영역 컴포넌트의 `icon` prop에 `any` 사용

**영향 범위:** ESLint `no-explicit-any` 에러 1건

**증상:**
```typescript
// admin/users/assign/page.tsx:171
function DroppableColumn({ icon, ... }: { icon: any; ... }) { ... }
```

**원인 분석:**
dnd-kit을 사용한 드래그앤드롭 UI에서 각 컬럼에 아이콘을 prop으로 전달. 원인 5와 동일하게 lucide-react 아이콘 타입을 명시하지 않음.

**해결 방법:**
```typescript
import { type LucideIcon } from "lucide-react";

function DroppableColumn({ icon: Icon, ... }: {
  icon: LucideIcon;  // ← any → LucideIcon
  ...
}) { ... }
```

---

### 🔴 원인 7: catch 블록의 `err: any` 및 `any[]` (API routes)

**영향 범위:** ESLint `no-explicit-any` 에러 2건 (원인 3과 별도)

**증상:**
```typescript
// submissions/[id]/bump/route.ts:140
} catch (e: any) {
    console.error("[bump] ERROR:", e?.message, e?.code, e?.meta);

// submissions/[id]/route.ts:115 — siblings any[]
let siblings: any[] = [];
```

**원인 분석:**
- **bump/route.ts**: Prisma 에러의 `code`와 `meta` 필드에 접근하기 위해 `any` 사용. Prisma 에러는 `PrismaClientKnownRequestError` 타입이지만 일반 `Error`와 union으로 처리해야 해서 `any`로 처리.
- **route.ts**: siblings 배열의 정확한 타입을 정의하기 번거로워서 `any[]`.

**해결 방법:**
```typescript
// bump/route.ts — Prisma 에러 타입 가드
import { Prisma } from "@/generated/prisma/client";

} catch (e: unknown) {
  const message = e instanceof Error ? e.message : "버전 생성 중 오류가 발생했습니다.";
  const prismaCode = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : undefined;
  console.error("[bump] ERROR:", message, prismaCode);
  return NextResponse.json({
    error: { code: "INTERNAL_ERROR", message, prismaCode }
  }, { status: 500 });
}

// route.ts — Prisma select 결과 타입 활용
let siblings: Array<{ id: string; version: string; createdAt: Date; status: string }> = [];
```

---

### 🔴 원인 8: URL ↔ State 동기화 안티패턴

**영향 범위:** ESLint 에러 2건 (`set-state-in-effect`) + 경고 2건 (`exhaustive-deps`)

**증상 (2개 파일에서 동일한 코드 복붙):**
```typescript
// videos-browser.tsx:194-198, stars/page.tsx:40-43
const [page, setPageState] = useState(1);
const searchParams = useSearchParams();

useEffect(() => {
  const urlPage = Number(searchParams.get("page")) || 1;
  if (urlPage !== page) setPageState(urlPage);  // 🔴 set-state-in-effect
}, [searchParams]);                               // ⚠️ exhaustive-deps (page 누락)
```

**원인 분석:**
URL의 `?page=` 파라미터를 React state로 동기화하려는 의도. 하지만:

1. **`set-state-in-effect`**: useEffect 안에서 동기적 setState → 불필요한 추가 렌더 발생
2. **`exhaustive-deps`**: `page`가 의존성 배열에 없어서 stale closure 위험
3. **근본 문제**: `searchParams`에서 파생 가능한 값을 별도 state로 관리 → "Derived State" 안티패턴

**해결 방법:**
```typescript
// page를 state 대신 searchParams에서 직접 파생
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

// state 제거 → searchParams에서 직접 계산
const page = Number(searchParams.get("page")) || 1;

// useEffect 완전 제거 — 필요 없음

const setPage = useCallback((newPage: number) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(newPage));
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
}, [searchParams, router, pathname]);
```

이 수정으로 `set-state-in-effect` 2건 + `exhaustive-deps` 2건 = **4건 동시 해결**.

---

### 🔴 원인 9: 렌더 함수 내 `Date.now()` 호출 (비순수 렌더)

**영향 범위:** ESLint 에러 1건 (`react-hooks/purity`)

**증상:**
```typescript
// video-manager-client.tsx:248
const diffMs = Math.abs(Date.now() - createdDate.getTime());
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
const relativeDate = diffDays === 0 ? "오늘" : diffDays === 1 ? "어제" : `${diffDays}일 전`;
```

**원인 분석:**
이 코드는 컴포넌트의 렌더 함수 본문에 직접 위치. `Date.now()`는 호출할 때마다 다른 값을 반환하는 비순수(impure) 함수. React는 컴포넌트 렌더가 동일한 입력에 동일한 출력을 내야 한다고 기대(멱등성). `Date.now()`가 렌더 중에 호출되면 이 원칙이 깨짐.

**해결 방법:**
```typescript
// useMemo로 감싸서 data.createdAt가 변경될 때만 재계산
const relativeDate = useMemo(() => {
  const createdDate = new Date(data.createdAt);
  const diffMs = Math.abs(Date.now() - createdDate.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? "오늘" : diffDays === 1 ? "어제" : `${diffDays}일 전`;
}, [data.createdAt]);
```

---

### 🔴 원인 10: `navItems` 배열 타입 추론 실패 → `@ts-ignore` 사용

**영향 범위:** ESLint 에러 1건 (`ban-ts-comment`)

**증상:**
```typescript
// sidebar.tsx:20-30
const navItems = [
  { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/stars/my-videos", label: "내 영상 관리", icon: Clapperboard },
  { href: "/stars/upload", label: "프로젝트 찾기 & 제출", icon: Rocket, isSpecial: true },
  // ↑ 이 항목만 isSpecial이 있음
  { href: "/stars/feedback", label: "피드백 확인", icon: MessageCircleHeart },
];

// sidebar.tsx:71
// @ts-ignore - isSpecial might not exist on all items type definition inferred
const isSpecial = item.isSpecial;
```

**원인 분석:**
TypeScript가 배열 리터럴을 추론할 때, 4개 중 1개만 `isSpecial`이 있으므로 union 타입으로 추론됨. 대부분의 요소에 `isSpecial`이 존재하지 않아 접근 시 타입 에러 발생 → `@ts-ignore`로 억제.

**해결 방법:**
```typescript
import { type LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isSpecial?: boolean;   // ← optional로 명시
}

const navItems: NavItem[] = [
  { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/stars/upload", label: "프로젝트 찾기 & 제출", icon: Rocket, isSpecial: true },
  // ...
];

// 이제 @ts-ignore 없이 안전하게 접근
const isSpecial = item.isSpecial;
```

---

### 🔴 원인 11: `<a>` 태그의 의도적 사용 vs ESLint 규칙 충돌

**영향 범위:** ESLint 에러 1건 (`no-html-link-for-pages`)

**증상:**
```typescript
// public-header.tsx:25-26
{/* Logo - Force reload to reset state */}
<a href="/" className="flex items-center gap-2.5 ...">
```

**원인 분석:**
주석에 "Force reload to reset state"라고 명시. 이것은 **의도적인 `<a>` 사용**.
Next.js의 `<Link>`는 클라이언트 사이드 네비게이션(SPA)이라 전체 페이지를 리로드하지 않음.
로고 클릭 시 애플리케이션 상태(Zustand store, React Query cache 등)를 완전히 초기화하기 위해 브라우저의 full page reload가 필요한 상황.

**해결 방법 (2가지):**
```typescript
// 방법 A (권장): ESLint 예외 처리 — 의도가 주석으로 명확히 설명되어 있으므로
{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
<a href="/" className="...">

// 방법 B: Link 사용 + onClick으로 강제 리로드 (규칙 준수하나 코드가 복잡해짐)
<Link href="/" onClick={(e) => { e.preventDefault(); window.location.href = "/"; }} className="...">
```

---

### 🔴 원인 12: 루트 CJS 유틸리티 스크립트 (`verify_existing_thumbs.js`)

**영향 범위:** ESLint 에러 1건 (`no-require-imports`)

**증상:**
```javascript
// verify_existing_thumbs.js:1
const { ... } = require("...");
```

**원인 분석:**
이 파일은 일회성 마이그레이션 유틸리티 스크립트(에어테이블 → DB 데이터 이관 등). 프로덕션 코드가 아니며, ESLint가 루트의 `.js` 파일까지 검사 범위에 포함시키면서 발생.

**해결 방법 (3가지 중 택1):**
```javascript
// 방법 A (권장): ESLint에서 제외
// eslint.config.mjs에 추가:
{ ignores: ["verify_existing_thumbs.js", "scripts/**"] }

// 방법 B: 파일 삭제 (이미 사용 완료된 마이그레이션 스크립트라면)

// 방법 C: ESM으로 변환
import { ... } from "...";
```

---

## 미사용 변수 경고 분석 (46건)

별도 근본 원인이 아닌 **개발 잔여물**. 기능 구현 과정에서 import해두고 사용하지 않은 것.

### 패턴별 분류

| 패턴 | 건수 | 설명 |
|------|------|------|
| 미사용 아이콘 import | ~20건 | lucide-react에서 가져온 뒤 안 쓴 아이콘 |
| 미사용 UI 컴포넌트 import | ~12건 | shadcn/ui 컴포넌트 (Badge, Input, Button 등) |
| 미사용 React hook import | ~5건 | useState, useEffect 등 |
| 미사용 유틸 import | ~4건 | cn, Skeleton 등 |
| 미사용 로컬 변수 | ~5건 | 구조분해 할당 후 사용 안 함 |

**해결 방법:**
```bash
# ESLint --fix로 자동 제거 불가 (unused-vars는 자동 수정 미지원)
# 수동으로 제거하거나, IDE의 "Organize Imports" 기능 활용
```

---

## 수정 우선순위 및 예상 작업량

### P0 — 즉시 (1건 수정으로 ~40% 에러 해결)

| # | 원인 | 작업 | 해결되는 에러 수 | 노력 |
|---|------|------|----------------|------|
| 1 | 원인 1 | `pnpm add -D @testing-library/dom` | TS 9건 + 테스트 9 suites | 1분 |
| 2 | 원인 2 | `VideoSubject` mock 추가 | 테스트 1 suite | 2분 |

### P1 — 핵심 에러 (ESLint error → CI 차단)

| # | 원인 | 작업 | 해결되는 에러 수 | 노력 |
|---|------|------|----------------|------|
| 3 | 원인 3 | Prisma JsonValue 타입 수정 | 8건 (+ 중복 로직 제거) | 15분 |
| 4 | 원인 8 | URL↔State 패턴 리팩토링 | 에러 2건 + 경고 2건 | 10분 |
| 5 | 원인 4 | select onChange 타입 캐스팅 | 3건 | 5분 |
| 6 | 원인 5+6 | `LucideIcon` 타입 적용 | 3건 | 5분 |
| 7 | 원인 7 | catch 블록 `unknown` 전환 | 2건 | 10분 |
| 8 | 원인 9 | Date.now() useMemo 이동 | 1건 | 3분 |
| 9 | 원인 10 | NavItem 인터페이스 정의 | 1건 | 3분 |
| 10 | 원인 11 | eslint-disable 추가 | 1건 | 1분 |
| 11 | — | `'` → `&apos;` 이스케이프 | 2건 | 1분 |
| 12 | 원인 12 | eslint ignores 추가 | 1건 | 1분 |

### P2 — 경고 (코드 품질)

| # | 작업 | 건수 | 노력 |
|---|------|------|------|
| 13 | 미사용 import/변수 정리 | 46건 | 20분 |
| 14 | 테스트 코드 implicit any 수정 | 5건 | 10분 |

### P3 — 장기 관찰

| # | 항목 | 설명 |
|---|------|------|
| 15 | middleware → proxy 마이그레이션 | Next.js 16 deprecated 경고. 동작 문제 없음 |
| 16 | AI 트리거 로직 중복 제거 | trigger.ts와 analyze/route.ts의 저장 로직 통합 |
| 17 | submissions 테스트 stderr 경고 | AI 트리거 mock 보강 |

---

## 파일별 에러 맵

총 **26개 소스 파일**에 에러/경고 존재.

```
src/
├── app/
│   ├── (admin)/admin/
│   │   ├── settlements/page.tsx              ⚠ 3 warnings (unused imports)
│   │   └── users/assign/page.tsx             🔴 원인6 (icon: any) + ⚠ 5 warnings
│   ├── (dashboard)/stars/
│   │   ├── dashboard/page.tsx                ⚠ 7 warnings (unused imports)
│   │   ├── feedback/page.tsx                 ⚠ 3 warnings
│   │   ├── my-videos/[id]/submission-detail-client.tsx  🔴 원인5 (statusMap icon) + ⚠ 3 warnings
│   │   └── upload/upload-client.tsx          🔴 원인4 (as any) + unescaped entities + ⚠ 4 warnings
│   ├── (videos)/
│   │   ├── stars/page.tsx                    🔴 원인8 (setState in effect) + ⚠ 1 warning
│   │   └── videos/[id]/page.tsx              ⚠ 1 warning
│   └── api/
│       ├── admin/users/assign/route.ts       ⚠ 1 warning
│       ├── ai/analyze/route.ts               🔴 원인3 (Prisma JsonValue x4)
│       ├── my-projects/videos/route.ts       ⚠ 1 warning
│       ├── submissions/[id]/bump/route.ts    🔴 원인7 (catch any)
│       └── submissions/[id]/route.ts         🔴 원인7 (siblings any[])
├── components/
│   ├── feedback/
│   │   ├── ai-insights-panel.tsx             ⚠ 1 warning
│   │   ├── ai-todo-list.tsx                  ⚠ 3 warnings
│   │   └── unified-feedback-list.tsx         🔴 원인4 (as any) + ⚠ 1 warning
│   ├── layout/
│   │   ├── public-header.tsx                 🔴 원인11 (<a> 의도적 사용)
│   │   └── sidebar.tsx                       🔴 원인10 (@ts-ignore)
│   └── video/
│       ├── submission-list.tsx               🔴 원인5 (icon any) + ⚠ 4 warnings
│       ├── videos-browser.tsx                🔴 원인8 (setState in effect) + ⚠ 2 warnings
│       └── video-manager/
│           ├── property-inspector.tsx        ⚠ 4 warnings
│           ├── version-timeline.tsx          ⚠ 3 warnings
│           └── video-manager-client.tsx      🔴 원인9 (Date.now) + 원인4 (as any) + ⚠ 1 warning
├── lib/
│   ├── ai/gemini.ts                          🔴 원인3 (catch any)
│   ├── ai/trigger.ts                         🔴 원인3 (JsonValue x3 + catch any)
│   ├── cloudflare/r2-upload.ts               ⚠ 1 warning
│   └── supabase/proxy.ts                     ⚠ 1 warning
├── __tests__/                                ❌ 원인1 (dom 미설치) + 원인2 (mock 누락)
└── (root)
    └── verify_existing_thumbs.js             🔴 원인12 (CJS 스크립트)
```
