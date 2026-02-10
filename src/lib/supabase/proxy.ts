import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "ADMIN" | "STAR";

function getRoleFromClaims(claims: unknown): UserRole | null {
  if (!claims || typeof claims !== "object") {
    return null;
  }

  const claimsRecord = claims as Record<string, unknown>;
  const appMetadata =
    claimsRecord.app_metadata && typeof claimsRecord.app_metadata === "object"
      ? (claimsRecord.app_metadata as Record<string, unknown>)
      : null;
  const userMetadata =
    claimsRecord.user_metadata && typeof claimsRecord.user_metadata === "object"
      ? (claimsRecord.user_metadata as Record<string, unknown>)
      : null;

  const roleCandidates = [appMetadata?.role, userMetadata?.role];

  for (const candidate of roleCandidates) {
    if (candidate === "ADMIN" || candidate === "STAR") {
      return candidate;
    }
  }

  return null;
}

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

  // Public paths that don't require authentication
  const publicPaths = ["/videos", "/stars"];
  const pathname = request.nextUrl.pathname;
  const isPublicPath = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!authId && !request.nextUrl.pathname.startsWith("/auth") && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (authId && request.nextUrl.pathname === "/") {
    const metadataRole = getRoleFromClaims(claims);
    let role: UserRole = metadataRole ?? "STAR";

    if (!metadataRole) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("authId", authId)
        .maybeSingle();

      if (dbUser?.role === "ADMIN" || dbUser?.role === "STAR") {
        role = dbUser.role;
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = role === "ADMIN" ? "/admin" : "/stars/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
