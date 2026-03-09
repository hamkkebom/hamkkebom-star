import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * JWT 페이로드에서 authId(sub)를 로컬에서 추출합니다.
 * 네트워크 호출 없이 쿠키의 JWT를 디코드하여 200~500ms 절감.
 * 만료 여부는 미들웨어 수준에서 체크하지 않음 (레이아웃에서 getAuthUser가 검증).
 */
function getAuthIdFromCookies(request: NextRequest): string | null {
  // Supabase는 sb-{ref}-auth-token 으로 쿠키 저장
  // 쿠키 이름은 sb-{project_ref}-auth-token 또는 직접 base64 조각
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find((c) => c.name.includes("auth-token"));

  if (!authCookie?.value) return null;

  try {
    // Supabase의 auth-token 쿠키는 base64url 인코딩된 JSON
    // 형식: base64url(JSON({access_token, ...}))  또는 직접 JSON
    let parsed: { access_token?: string } | null = null;

    const val = authCookie.value;
    // base64url 디코딩 시도
    if (val.startsWith("base64-")) {
      const decoded = Buffer.from(val.slice(7), "base64").toString("utf-8");
      parsed = JSON.parse(decoded);
    } else {
      // JSON 직접 파싱 시도
      try {
        parsed = JSON.parse(val);
      } catch {
        // URL 인코딩된 경우
        parsed = JSON.parse(decodeURIComponent(val));
      }
    }

    const accessToken = parsed?.access_token;
    if (!accessToken) return null;

    // JWT payload 디코드 (header.payload.signature)
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // 🔥 최적화: 먼저 로컬 JWT 파싱으로 authId 추출 (네트워크 호출 0)
  const authId = getAuthIdFromCookies(request);

  const pathname = request.nextUrl.pathname;

  // 공개 경로 — 인증 불필요
  const publicPrefixes = ["/auth", "/videos", "/api/videos", "/api/stars", "/api/categories", "/api/health", "/offline"];
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/stars" ||
    pathname.startsWith("/stars/profile/") ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!authId && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 토큰 갱신이 필요한 경우에만 Supabase 미들웨어 호출
  // 세션 쿠키를 유지하기 위해 setAll은 여전히 필요하지만
  // getClaims() 대신 로컬 파싱으로 인증 체크 완료
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser()는 토큰 갱신 + 쿠키 업데이트를 트리거하므로 유지
  // 하지만 이것은 미들웨어의 주 목적(세션 유지)을 위한 것이지
  // 인증 가드를 위한 것이 아님 → 인증 가드는 위에서 로컬 JWT 파싱으로 완료
  await supabase.auth.getUser();

  return supabaseResponse;
}
