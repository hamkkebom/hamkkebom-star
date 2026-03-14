import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js"; // Use supabase-js directly for admin
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

// Admin Client 생성 (Service Role Key 필요)
// 주의: 이 키는 절대 클라이언트에 노출되면 안 됨.
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

export async function GET(_req: NextRequest) {
    try {
        const requester = await getAuthUser();
        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                createdAt: true,
                isApproved: true,
                _count: {
                    select: { managedStars: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ data: admins });
    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const requester = await getAuthUser();
        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. 입력 검증
        const body = await req.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // 3. Supabase Auth Admin API로 유저 생성
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // 이메일 인증 자동 완료
            user_metadata: { name },
        });

        if (authError || !authData.user) {
            console.error("Supabase Admin Create Error:", authError);
            return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 400 });
        }

        // 4. Prisma DB에 User 레코드 생성
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                authId: authData.user.id,
                role: "ADMIN",
                isApproved: true,
                avatarUrl: null,
            },
        });

        return NextResponse.json({ data: newUser });

    } catch (err) {
        console.error("Create Admin API Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const requester = await getAuthUser();
        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, isApproved } = body;

        if (!id || typeof isApproved !== "boolean") {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const updatedAdmin = await prisma.user.update({
            where: { id },
            data: { isApproved },
        });

        return NextResponse.json({ data: updatedAdmin });
    } catch (err) {
        console.error("Update Admin API Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
