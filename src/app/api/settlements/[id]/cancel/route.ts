import { NextResponse } from "next/server";
import { SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }
    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 정산을 수정할 수 있습니다." } },
            { status: 403 }
        );
    }

    const { id } = await params;

    try {
        const updated = await prisma.settlement.update({
            where: { id },
            data: {
                status: SettlementStatus.PENDING,
            },
            include: {
                star: { select: { id: true, name: true, email: true } },
                _count: { select: { items: true } },
            },
        });

        return NextResponse.json({ data: updated });
    } catch {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "정산을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }
}
