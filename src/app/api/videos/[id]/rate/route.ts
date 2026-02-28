import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

const updateRateSchema = z.object({
    customRate: z.number().min(0).nullable(),
});

export async function PATCH(request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 영상 단가를 설정할 수 있습니다." } },
            { status: 403 },
        );
    }

    const { id } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
            { status: 400 },
        );
    }

    const parsed = updateRateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
            { status: 400 },
        );
    }

    const video = await prisma.video.findUnique({ where: { id }, select: { id: true } });
    if (!video) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "영상을 찾을 수 없습니다." } },
            { status: 404 },
        );
    }

    const updated = await prisma.video.update({
        where: { id },
        data: { customRate: parsed.data.customRate },
        select: { id: true, title: true, customRate: true },
    });

    return NextResponse.json({ data: updated });
}
