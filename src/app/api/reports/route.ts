import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { ReportTarget, ReportReason } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const validTargets = new Set(Object.values(ReportTarget));
const validReasons = new Set(Object.values(ReportReason));

/** POST /api/reports — 신고 접수 */
export async function POST(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetType, targetId, reason, description } = await request.json();

    if (!targetType || !validTargets.has(targetType)) {
        return NextResponse.json({ error: "유효하지 않은 신고 대상입니다." }, { status: 400 });
    }
    if (!reason || !validReasons.has(reason)) {
        return NextResponse.json({ error: "신고 사유를 선택해주세요." }, { status: 400 });
    }
    if (!targetId) {
        return NextResponse.json({ error: "신고 대상 ID가 필요합니다." }, { status: 400 });
    }

    // 중복 신고 방지
    const existing = await prisma.report.findFirst({
        where: { reporterId: user.id, targetType, targetId, status: "PENDING" },
    });
    if (existing) {
        return NextResponse.json({ error: "이미 신고한 항목입니다." }, { status: 409 });
    }

    const report = await prisma.report.create({
        data: {
            reporterId: user.id,
            targetType,
            targetId,
            reason,
            description: description?.trim() || null,
        },
    });

    return NextResponse.json(report, { status: 201 });
}

/** GET /api/reports — 관리자 신고 목록 */
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const page = Math.max(1, Number(searchParams.get("page") || "1"));

    const where: any = {};
    if (status !== "ALL") where.status = status;

    const [reports, total] = await Promise.all([
        prisma.report.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * 20,
            take: 20,
            include: {
                reporter: { select: { id: true, name: true, chineseName: true, role: true } },
            },
        }),
        prisma.report.count({ where }),
    ]);

    return NextResponse.json({ data: reports, total, page, totalPages: Math.ceil(total / 20) });
}
