# COMPONENTS

도메인별 분리. shadcn/ui 기반. Server Component 기본, `"use client"` 명시만 클라이언트.

## STRUCTURE

```
components/
├── ui/           # shadcn/ui — DO NOT EDIT. `npx shadcn@latest add {name}`
├── layout/       # 레이아웃 쉘 (Sidebar, Header, PublicHeader/Footer)
├── project/      # 제작요청 (RequestForm, RequestCard, FilterBar, AdminRequestsPanel)
├── video/        # 영상 (VideoPlayer, UploadDropzone, VideoCard, SubmissionList)
├── feedback/     # 피드백 (FeedbackForm, FeedbackList)
└── auth/         # 인증 (LoginForm, SignupForm, AuthCardWrapper)
```

## FORM PATTERN (react-hook-form + zod)

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { someSchema, type SomeInput } from "@/lib/validations/{domain}";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

export function SomeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<SomeInput>({
    resolver: zodResolver(someSchema),
    defaultValues: { ... },
  });

  const onSubmit = async (values: SomeInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/{domain}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "오류가 발생했습니다.");
      }
      toast.success("성공!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="fieldName" render={({ field }) => (
          <FormItem>
            <FormLabel>라벨</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={isSubmitting}>저장</Button>
      </form>
    </Form>
  );
}
```

**참고 구현**: `project/request-form.tsx` (복잡한 폼), `auth/login-form.tsx` (인증 폼)

## DATA FETCHING PATTERN (TanStack Query)

```tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// 읽기
const { data, isLoading, error } = useQuery({
  queryKey: ["domain", "list", { status, search }],
  queryFn: async () => {
    const res = await fetch(`/api/{domain}?status=${status}&search=${search}`);
    if (!res.ok) throw new Error("Failed");
    return res.json();
  },
});

// 쓰기
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (payload) => {
    const res = await fetch("/api/{domain}", { method: "POST", ... });
    if (!res.ok) throw new Error((await res.json()).error?.message);
    return res.json();
  },
  onSuccess: () => {
    toast.success("성공!");
    queryClient.invalidateQueries({ queryKey: ["domain"] });
  },
  onError: (err) => toast.error(err.message),
});
```

**참고 구현**: `project/admin-requests-panel.tsx` (full CRUD), `project/request-list.tsx` (읽기)

## LAYOUT COMPONENTS

| Component | 위치 | 용도 |
|-----------|------|------|
| `sidebar.tsx` | (dashboard) layout | STAR 네비게이션 7항목, usePathname 활성 감지 |
| `admin-sidebar.tsx` | (admin) layout | ADMIN 네비게이션 7항목, exact path 매칭 |
| `header.tsx` | 공통 | ThemeToggle + NotificationBadge + UserDropdown + Logout |
| `public-header.tsx` | (videos) layout | 공개 페이지 헤더 |
| `public-footer.tsx` | (videos) layout | 공개 페이지 푸터 |
| `notification-badge.tsx` | header 내부 | useNotifications() 훅 연동, role별 카운트 |
| `theme-toggle.tsx` | header 내부 | next-themes useTheme() |

## VIDEO COMPONENTS

- `video-player.tsx` — HLS.js 동적 import, seek/duration 콜백. `import("hls.js")` 패턴
- `upload-dropzone.tsx` — 3단계: (1) POST /api/submissions/upload-url (2) XHR PUT CF (3) POST /api/submissions. 진행률 추적
- `upload-progress.tsx` — Progress 바 표시
- `video-card.tsx` — 썸네일 + 메타 표시. compact 모드 지원
- `submission-list.tsx` — 제출물 목록 표시
- `swimlane-row.tsx` — 타임라인/스위레인 뷰

## CONVENTIONS

- **shadcn/ui 수정 금지**: `src/components/ui/*` 직접 편집 NO → `npx shadcn@latest add` 사용
- **"use client" 최소화**: 인터랙티브 컴포넌트만 클라이언트
- **에러 처리**: try/catch + `toast.error()` (sonner)
- **로딩 UI**: Skeleton 컴포넌트 또는 isLoading 상태
- **날짜 표시**: `Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" })`
- **금액 표시**: `Intl.NumberFormat("ko-KR").format(n) + "원"`
- **아이콘**: lucide-react만 사용
- **텍스트→배열 변환**: 쉼표 구분 텍스트를 split/trim/filter로 배열 변환 (request-form 참고)
- **URL 상태 동기화**: useSearchParams + useRouter + 350ms debounce (filter-bar 참고)

## ANTI-PATTERNS

- `components/ui/` 파일 직접 편집 금지
- 컴포넌트 간 공유 상태에 useState 사용 금지 → Zustand
- form.handleSubmit 밖에서 form 데이터 접근 금지
- useEffect 내 직접 fetch → useQuery로 대체
- 인라인 스타일 사용 금지 → Tailwind 유틸리티 클래스
