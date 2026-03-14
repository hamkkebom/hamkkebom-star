import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * JWT 페이로드에서 authId(sub)를 로컬에서 추출합니다.
 * 네트워크 호출 없이 쿠키의 JWT를 디코드하여 200~500ms 절감.
 * 만료 여부는 미들웨어 수준에서 체크하지 않음 (레이아웃에서 getAuthUser가 검증).
 */
function getAuthIdFromCookies(request: NextRequest): string | null {
  // Supabase는 sb-{ref}-auth-token 으로 쿠키 저장
  // 4KB 초과 시 .0, .1 등으로 청크 분할됨
  const cookies = request.cookies.getAll();

  // 청크가 아닌 단일 쿠키 먼저 확인
  const singleCookie = cookies.find(
    (c) => c.name.includes("auth-token") && !c.name.match(/\.\d+$/)
  );

  let rawValue: string | null = null;

  if (singleCookie?.value) {
    rawValue = singleCookie.value;
  } else {
    // 청크 분할된 쿠키 결합 (sb-xxx-auth-token.0, .1, .2, ...)
    const chunkCookies = cookies
      .filter((c) => c.name.includes("auth-token") && c.name.match(/\.\d+$/))
      .sort((a, b) => {
        const aNum = parseInt(a.name.match(/\.(\d+)$/)?.[1] ?? "0");
        const bNum = parseInt(b.name.match(/\.(\d+)$/)?.[1] ?? "0");
        return aNum - bNum;
      });

    if (chunkCookies.length > 0) {
      rawValue = chunkCookies.map((c) => c.value).join("");
    }
  }

  if (!rawValue) return null;

  try {
    let parsed: { access_token?: string } | null = null;

    if (rawValue.startsWith("base64-")) {
      const decoded = Buffer.from(rawValue.slice(7), "base64").toString("utf-8");
      parsed = JSON.parse(decoded);
    } else {
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        parsed = JSON.parse(decodeURIComponent(rawValue));
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

    // JWT 만료 검증: 만료된 토큰은 인증되지 않은 것으로 처리
    // (만료 토큰으로 보호 페이지 접근 방지)
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return null;
    }

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
  const publicPrefixes = [
    "/auth", "/videos", "/api/videos", "/api/stars", "/api/categories", "/api/health", "/offline",
    "/community", "/explore",           // 커뮤니티 공개 접근
    "/api/board", "/api/search",        // 게시판/검색 API 공개
    "/api/reports", "/api/users",       // 신고/팔로우 API
    "/api/announcements", "/api/faq", "/api/guide",  // 공지/FAQ/가이드 API
    "/announcements", "/faq", "/guide", "/help",      // 공지/FAQ/가이드/지원센터 페이지
    "/portfolio",                       // 포트폴리오 공개
    "/showcase", "/best", "/categories", "/counselors", // 공개 콘텐츠 페이지
    "/about", "/terms", "/privacy", "/recruit", "/updates", "/install", // 정보 페이지
  ];
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/stars" ||
    pathname.startsWith("/stars/profile/") ||
    publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  // API 경로는 미들웨어에서 리다이렉트하지 않음 (API가 자체적으로 401 반환)
  const isApiRoute = pathname.startsWith("/api/");

  if (!authId && !isPublicRoute && !isApiRoute) {
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

  // CDN/프록시 캐싱 방지: Set-Cookie가 캐시되면 다른 유저 세션 유출 위험
  supabaseResponse.headers.set("Cache-Control", "private, no-store");

  return supabaseResponse;
}
