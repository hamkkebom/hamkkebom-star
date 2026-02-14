import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // 이메일 중복 체크 (Prisma)
        const checkUser = await prisma.user.findFirst({
            where: { email: email },
        });

        if (checkUser) {
            return NextResponse.json(
                { error: "이미 사용 중인 이메일입니다." },
                { status: 409 }
            );
        }

        // Admin Client 생성
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
            return NextResponse.json(
                { error: "Server Configuration Error: Missing Service Role Key" },
                { status: 500 }
            );
        }
        const supabaseAdmin = createAdminClient();

        // 이메일 즉시 변경 (email_confirm: true -> 확인 메일 안 보냄)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { email: email, email_confirm: true }
        );

        if (updateError) {
            console.error("Supabase Admin Update Error:", updateError);
            return NextResponse.json({ error: `Supabase Error: ${updateError.message}` }, { status: 500 });
        }

        // Prisma DB 동기화
        await prisma.user.update({
            where: { authId: user.id },
            data: { email: email },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Email change error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
