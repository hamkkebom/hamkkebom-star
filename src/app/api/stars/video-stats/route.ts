import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/stars/video-stats
 *
 * STAR의 영상 통계 트렌드 — 최근 6개월 월별 제출/승인/조회수 추이
 */
export async function GET() {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "STAR") {
        return NextResponse.json({ error: "STAR only" }, { status: 403 });
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ✅ 3개 쿼리 병렬 실행 (직렬 → Promise.all)
    const [submissions, videos, feedbacks] = await Promise.all([
        // 제출물 통계
        prisma.submission.findMany({
            where: {
                starId: user.id,
                createdAt: { gte: sixMonthsAgo },
            },
            select: {
                createdAt: true,
                status: true,
            },
        }),
        // 비디오 조회수
        prisma.video.findMany({
            where: { ownerId: user.id },
            select: {
                viewCount: true,
                createdAt: true,
            },
        }),
        // 피드백 수
        prisma.feedback.findMany({
            where: {
                submission: { starId: user.id },
                createdAt: { gte: sixMonthsAgo },
            },
            select: {
                createdAt: true,
                status: true,
            },
        }),
    ]);

    // 월별 그룹화
    const monthlyMap: Record<string, {
        submitted: number;
        approved: number;
        rejected: number;
        feedbacks: number;
        resolvedFeedbacks: number;
    }> = {};

    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { submitted: 0, approved: 0, rejected: 0, feedbacks: 0, resolvedFeedbacks: 0 };
    }

    for (const s of submissions) {
        const d = new Date(s.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key]) {
            monthlyMap[key].submitted += 1;
            if (s.status === "APPROVED") monthlyMap[key].approved += 1;
            if (s.status === "REJECTED") monthlyMap[key].rejected += 1;
        }
    }

    for (const f of feedbacks) {
        const d = new Date(f.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key]) {
            monthlyMap[key].feedbacks += 1;
            if (f.status === "RESOLVED") monthlyMap[key].resolvedFeedbacks += 1;
        }
    }

    const data = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

    // 요약
    const totalViews = videos.reduce((s, v) => s + v.viewCount, 0);
    const totalSubmissions = submissions.length;
    const totalApproved = submissions.filter((s) => s.status === "APPROVED").length;
    const approvalRate = totalSubmissions > 0 ? Math.round((totalApproved / totalSubmissions) * 100) : 0;

    return NextResponse.json({
        data,
        summary: {
            totalViews,
            totalSubmissions,
            totalApproved,
            approvalRate,
            totalFeedbacks: feedbacks.length,
        },
    });
}
