import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function DELETE(
    req: NextRequest,
    context: any // id is the manager's prisma user.id
) {
    try {
        const params = await context.params;
        const id = params.id;
        const body = await req.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
        }

        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requester = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { role: true, email: true },
        });

        if (!requester || requester.role !== "ADMIN" || !requester.email) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 1. 현재 관리자의 비밀번호를 검증합니다.
        // 세션을 건드리지 않기 위해 supabase-js의 익명 클라이언트를 임시로 사용
        const tempClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false } }
        );

        const { error: signInError } = await tempClient.auth.signInWithPassword({
            email: requester.email,
            password: password,
        });

        if (signInError) {
            return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
        }

        // 2. 삭제 대상 관리자 계정 찾기
        const targetAdmin = await prisma.user.findUnique({
            where: { id: id },
            select: { id: true, authId: true, role: true, email: true },
        });

        if (!targetAdmin) {
            return NextResponse.json({ error: "관리자를 찾을 수 없습니다." }, { status: 404 });
        }

        if (targetAdmin.role !== "ADMIN") {
            return NextResponse.json({ error: "해당 사용자는 관리자가 아닙니다." }, { status: 400 });
        }

        if (targetAdmin.authId === user.id) {
            return NextResponse.json({ error: "자기 자신의 계정은 삭제할 수 없습니다." }, { status: 400 });
        }

        // 3. Supabase Auth 사용자 삭제
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
            targetAdmin.authId
        );

        if (deleteAuthError) {
            console.error("Supabase Admin Delete Error:", deleteAuthError);
            return NextResponse.json({ error: "계정 삭제 중 오류가 발생했습니다." }, { status: 500 });
        }

        // 4. Prisma 사용자 삭제
        await prisma.user.delete({
            where: { id: id },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Delete Admin API Error:", err);
        // Prisma 연관관계 제약조건 에러 (P2003) 또는 일반적인 오류 메시지 노출
        const errorMessage = err?.message || "Internal Server Error";
        if (errorMessage.includes("Foreign key constraint")) {
            return NextResponse.json({ error: "해당 관리자에게 배정된 별(STAR)이 있어 삭제할 수 없습니다. 별 배정을 해제한 후 다시 시도해주세요." }, { status: 400 });
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
