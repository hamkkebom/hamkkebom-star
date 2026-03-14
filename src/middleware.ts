import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트에 대한 Rate Limiting + 세션 갱신
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    const result = checkRateLimit(ip, pathname);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "TOO_MANY_REQUESTS", message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
            "X-RateLimit-Remaining": String(result.remaining),
          },
        }
      );
    }

    // API 라우트도 세션 갱신 필요 — 만료된 토큰 자동 갱신 + 쿠키 전파
    // 이 없으면 토큰 만료 시 API가 401을 반환하고 쿠키가 갱신되지 않아
    // 다른 계정으로 로그인되거나 인증 실패가 발생할 수 있음
    const response = await updateSession(request);
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  // 비-API 라우트: 기존 세션 체크
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js|ico|xml|txt|webmanifest)$).*)",
  ],
};
