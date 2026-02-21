import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { z } from "zod";

const unassignedRateSchema = z.object({
    baseRate: z.number().min(0, "단가는 0 이상이어야 합니다."),
});

export async function POST(request: Request) {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
            { status: 403 }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
            { status: 400 }
        );
    }

    const parsed = unassignedRateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: {
                    code: "VALIDATION_ERROR",
                    message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
                },
            },
            { status: 400 }
        );
    }

    try {
        const result = await prisma.user.updateMany({
            where: {
                role: "STAR",
                gradeId: null,
            },
            data: {
                baseRate: parsed.data.baseRate,
            },
        });

        return NextResponse.json({ data: { count: result.count } }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "INTERNAL_ERROR",
                    message: error instanceof Error ? error.message : "알 수 없는 오류",
                },
            },
            { status: 500 }
        );
    }
}
