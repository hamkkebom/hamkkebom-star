# Learnings — full-implementation

**시작일**: 2026-02-10

---

## 컨벤션 & 패턴

(작업 진행 중 발견한 코드 컨벤션, 패턴을 여기 기록)

## [2026-02-10T16:04:53+09:00] Task 1.1: Supabase SSR Next.js 16 Proxy 패턴 적용
- Supabase 공식 Next.js SSR 문서(creating-a-client)는 Next.js 16에서 루트 `proxy.ts` + `supabase.auth.getClaims()` 기반 세션 갱신 패턴을 권장함.
- `@supabase/ssr` 0.8.0 + Next.js 16.1.6 조합에서 `createServerClient(..., { cookies: { getAll, setAll } })` 패턴은 그대로 유효하며, 서버 컴포넌트의 `setAll`은 try/catch로 무시하는 공식 예제와 동일하게 유지해야 함.
- Proxy의 신뢰 기준: `getSession()`은 서버 보호 로직에서 신뢰하지 말고, JWT 재검증을 수행하는 `getClaims()`를 사용해야 함.
- 기존 `updateSession`의 핵심 흐름(쿠키 갱신, 비인증 로그인 리다이렉트, `/` 진입 시 role 기반 리다이렉트)은 유지하고, claims에서 `sub`/metadata를 우선 사용하되 role 미존재 시 DB fallback으로 보완하는 형태가 안전함.
- 호환성 적용 방식: `src/lib/supabase/proxy.ts`에 최신 로직을 두고 `src/lib/supabase/middleware.ts`는 re-export로 유지하면 기존 import 경로와 신규 proxy 네이밍을 동시에 만족시킬 수 있음.
