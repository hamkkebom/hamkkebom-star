import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

type MonthlyGoal = {
    submissions: number;
    approvals: number;
    earnings: number;
};

/**
 * GET /api/stars/goals
 * 현재 월 목표 + 실적 + 달성률
 *
 * PATCH /api/stars/goals
 * 목표 업데이트
 */
export async function GET() {
    const user = await getAuthUser();
    if (!user || user.role !== "STAR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ getAuthUser()가 이미 전체 user를 반환하므로 중복 쿼리 없음
    const goal = (user.monthlyGoal as MonthlyGoal | null) ?? {
        submissions: 4,
        approvals: 3,
        earnings: 500000,
    };

    // 이번 달 실적
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [submissionCount, approvalCount, settlementsRaw] = await Promise.all([
        prisma.submission.count({
            where: {
                starId: user.id,
                createdAt: { gte: monthStart, lte: monthEnd },
            },
        }),
        prisma.submission.count({
            where: {
                starId: user.id,
                status: "APPROVED",
                createdAt: { gte: monthStart, lte: monthEnd },
            },
        }),
        prisma.settlement.findMany({
            where: {
                starId: user.id,
                startDate: { gte: monthStart },
            },
            select: { totalAmount: true },
        }),
    ]);

    const totalEarnings = settlementsRaw.reduce(
        (sum, s) => sum + Number(s.totalAmount),
        0
    );

    const actual = {
        submissions: submissionCount,
        approvals: approvalCount,
        earnings: totalEarnings,
    };

    const progress = {
        submissions: goal.submissions > 0 ? Math.min(100, Math.round((actual.submissions / goal.submissions) * 100)) : 0,
        approvals: goal.approvals > 0 ? Math.min(100, Math.round((actual.approvals / goal.approvals) * 100)) : 0,
        earnings: goal.earnings > 0 ? Math.min(100, Math.round((actual.earnings / goal.earnings) * 100)) : 0,
    };

    const overallProgress = Math.round(
        (progress.submissions + progress.approvals + progress.earnings) / 3
    );

    return NextResponse.json({
        data: {
            goal,
            actual,
            progress,
            overallProgress,
            month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        },
    });
}

export async function PATCH(request: Request) {
    const user = await getAuthUser();
    if (!user || user.role !== "STAR") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Partial<MonthlyGoal>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // ✅ getAuthUser()가 이미 전체 user를 반환하므로 중복 쿼리 없음
    const current = (user.monthlyGoal as MonthlyGoal | null) ?? {
        submissions: 4,
        approvals: 3,
        earnings: 500000,
    };

    const updated: MonthlyGoal = {
        submissions: body.submissions ?? current.submissions,
        approvals: body.approvals ?? current.approvals,
        earnings: body.earnings ?? current.earnings,
    };

    await prisma.user.update({
        where: { id: user.id },
        data: { monthlyGoal: updated },
    });

    return NextResponse.json({ data: updated });
}
