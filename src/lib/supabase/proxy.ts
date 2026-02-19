import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getAuthIdFromClaims(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") {
    return null;
  }

  const claimsRecord = claims as Record<string, unknown>;
  return typeof claimsRecord.sub === "string" ? claimsRecord.sub : null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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

          supabaseResponse = NextResponse.next({
            request,
          });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims ?? null;

  const authId = getAuthIdFromClaims(claims);

  const pathname = request.nextUrl.pathname;

  // 공개 경로 — 인증 불필요
  const publicPrefixes = ["/auth", "/videos", "/api/videos", "/api/stars", "/api/categories", "/api/health"];
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

  return supabaseResponse;
}
