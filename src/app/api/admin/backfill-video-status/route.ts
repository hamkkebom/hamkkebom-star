import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backfill-video-status
 * 1) Submission.status가 APPROVED인데 Video.status가 APPROVED가 아닌 영상 → status 일괄 업데이트
 * 2) 이미 APPROVED인 Video의 updatedAt을 Submission.approvedAt으로 갱신
 *    → 메인 페이지 정렬(updatedAt DESC) 시 최근 승인된 영상이 상위에 표시
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requester = await prisma.user.findUnique({
            where: { authId: user.id },
            select: { role: true },
        });

        if (!requester || requester.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 1단계: Video.status가 APPROVED가 아닌 건 → APPROVED로 변경
        const pendingSubmissions = await prisma.submission.findMany({
            where: {
                status: "APPROVED",
                videoId: { not: null },
                video: {
                    status: { not: "APPROVED" }
                }
            },
            select: {
                id: true,
                videoId: true,
                approvedAt: true,
                video: { select: { id: true, title: true, status: true } }
            }
        });

        const statusResults = [];
        for (const sub of pendingSubmissions) {
            if (!sub.videoId || !sub.video) continue;
            await prisma.video.update({
                where: { id: sub.videoId },
                data: { status: "APPROVED" }
            });
            statusResults.push({
                videoId: sub.videoId,
                title: sub.video.title,
                previousStatus: sub.video.status,
                newStatus: "APPROVED"
            });
        }

        // 2단계: 이미 APPROVED인 Video의 updatedAt을 Submission.approvedAt으로 갱신
        // → 최근 승인된 영상이 메인 페이지 상단에 정렬되도록 함
        const approvedSubmissions = await prisma.submission.findMany({
            where: {
                status: "APPROVED",
                videoId: { not: null },
                approvedAt: { not: null },
            },
            select: {
                videoId: true,
                approvedAt: true,
                video: { select: { id: true, title: true, updatedAt: true } }
            }
        });

        const dateResults = [];
        for (const sub of approvedSubmissions) {
            if (!sub.videoId || !sub.video || !sub.approvedAt) continue;
            // approvedAt이 video.updatedAt보다 최신이면 갱신
            if (sub.approvedAt > sub.video.updatedAt) {
                // Prisma @updatedAt 데코레이터를 우회하여 직접 rawSQL 사용
                await prisma.$executeRaw`
                    UPDATE videos SET "updatedAt" = ${sub.approvedAt} WHERE id = ${sub.videoId}
                `;
                dateResults.push({
                    videoId: sub.videoId,
                    title: sub.video.title,
                    previousUpdatedAt: sub.video.updatedAt,
                    newUpdatedAt: sub.approvedAt
                });
            }
        }

        return NextResponse.json({
            message: `상태 변경: ${statusResults.length}건, 날짜 갱신: ${dateResults.length}건`,
            statusUpdated: statusResults,
            dateUpdated: dateResults
        });

    } catch (err) {
        console.error("Backfill Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
