import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    // no user, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/") {
    const metadata: Record<string, unknown> =
      user.user_metadata && typeof user.user_metadata === "object"
        ? user.user_metadata
        : {};

    const metadataRole =
      metadata.role === "ADMIN" || metadata.role === "STAR"
        ? metadata.role
        : null;

    let role: "ADMIN" | "STAR" = metadataRole ?? "STAR";

    if (!metadataRole) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("authId", user.id)
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
