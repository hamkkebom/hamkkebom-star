import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** PATCH /api/reports/[id] — 신고 처리 (관리자) */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["UNDER_REVIEW", "RESOLVED", "DISMISSED", "ESCALATED"].includes(status)) {
        return NextResponse.json({ error: "유효하지 않은 상태입니다." }, { status: 400 });
    }

    const report = await prisma.report.update({
        where: { id },
        data: { status, resolvedBy: user.id, resolvedAt: new Date() },
    });

    return NextResponse.json(report);
}
