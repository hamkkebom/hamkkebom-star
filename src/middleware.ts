import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rate-limit";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API 라우트에 대한 Rate Limiting
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

    // API 라우트는 rate limit만 적용, 세션 체크는 각 route에서 개별 처리
    return NextResponse.next({
      headers: {
        "X-RateLimit-Remaining": String(result.remaining),
      },
    });
  }

  // 비-API 라우트: 기존 세션 체크
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js|ico|xml|txt|webmanifest)$).*)",
  ],
};
