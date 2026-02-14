import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function getRedirectPath(role: "ADMIN" | "STAR") {
  return role === "ADMIN" ? "/admin" : "/stars/dashboard";
}

function extractNameFromMetadata(
  metadata: Record<string, unknown>,
  email: string
) {
  const metadataName =
    (typeof metadata.name === "string" && metadata.name) ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.nickname === "string" && metadata.nickname);

  if (metadataName) {
    return metadataName;
  }

  return email.split("@")[0] ?? "사용자";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const supabase = await createClient();

  // If code present (email/OAuth flow), exchange it for a session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
    }
  }

  // Get authenticated user from session (works for both code exchange and direct signUp)
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.id || !authUser.email) {
    return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
  }

  // Find or create Prisma user
  let existingUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  // 이메일 변경 확인 후 Prisma DB 동기화
  if (existingUser && existingUser.email !== authUser.email) {
    existingUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: authUser.email },
    });
  }

  if (!existingUser) {
    const metadata: Record<string, unknown> =
      authUser.user_metadata && typeof authUser.user_metadata === "object"
        ? authUser.user_metadata
        : {};

    const name = extractNameFromMetadata(metadata, authUser.email);
    const phone = typeof metadata.phone === "string" ? metadata.phone : null;
    const chineseName =
      typeof metadata.chineseName === "string" ? metadata.chineseName : null;

    existingUser = await prisma.user.create({
      data: {
        authId: authUser.id,
        email: authUser.email,
        name,
        phone,
        chineseName,
      },
    });
  }

  // Check admin approval
  if (!existingUser.isApproved) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth/pending-approval", requestUrl.origin)
    );
  }

  // 이메일 변경 콜백인 경우 설정 페이지로 리다이렉트
  const type = requestUrl.searchParams.get("type");
  if (type === "email_change") {
    return NextResponse.redirect(
      new URL("/stars/settings", requestUrl.origin)
    );
  }

  const redirectPath = getRedirectPath(existingUser.role);
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
