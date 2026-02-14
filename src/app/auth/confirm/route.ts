import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");

    const supabase = await createClient();

    // PKCE 플로우: Supabase가 토큰 검증 후 code와 함께 리다이렉트
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("[/auth/confirm] code exchange failed:", error.message);
            return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
        }
    }
    // Token Hash 플로우: 직접 token_hash로 검증
    else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "email_change" | "signup" | "recovery" | "email",
        });
        if (error) {
            console.error("[/auth/confirm] verifyOtp failed:", error.message);
            return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
        }
    }
    // 파라미터 없으면 로그인으로
    else {
        return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
    }

    // 인증된 사용자 정보 가져오기
    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.id || !authUser.email) {
        return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
    }

    // Prisma DB에서 사용자 찾기
    const existingUser = await prisma.user.findUnique({
        where: { authId: authUser.id },
    });

    // 이메일 변경 동기화
    if (existingUser && existingUser.email !== authUser.email) {
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { email: authUser.email },
        });
    }

    // 설정 페이지로 리다이렉트
    return NextResponse.redirect(
        new URL("/stars/settings", requestUrl.origin)
    );
}
