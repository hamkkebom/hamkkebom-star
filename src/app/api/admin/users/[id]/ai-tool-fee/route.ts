import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 수정할 수 있습니다." } },
            { status: 403 }
        );
    }

    const { id } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
            { status: 400 }
        );
    }

    const payload = body as { aiToolSupportFee: number | null };
    const aiToolSupportFee = payload.aiToolSupportFee;

    if (aiToolSupportFee !== null && typeof aiToolSupportFee !== "number") {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: "올바른 숫자를 입력해주세요." } },
            { status: 400 }
        );
    }

    try {
        const updated = await prisma.user.update({
            where: { id },
            data: { aiToolSupportFee },
        });
        return NextResponse.json({ data: updated });
    } catch {
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "저장에 실패했습니다." } },
            { status: 500 }
        );
    }
}
