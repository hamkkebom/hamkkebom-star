import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/backfill-video-status
 * Submission.status가 APPROVED인데 Video.status가 APPROVED가 아닌 영상들을 일괄 업데이트합니다.
 * 1회성 백필용 엔드포인트
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

        const submissions = await prisma.submission.findMany({
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
                video: { select: { id: true, title: true, status: true } }
            }
        });

        const results = [];
        for (const sub of submissions) {
            if (!sub.videoId || !sub.video) continue;
            await prisma.video.update({
                where: { id: sub.videoId },
                data: { status: "APPROVED" }
            });
            results.push({
                videoId: sub.videoId,
                title: sub.video.title,
                previousStatus: sub.video.status,
                newStatus: "APPROVED"
            });
        }

        return NextResponse.json({
            message: `${results.length}개 영상의 status를 APPROVED로 변경 완료!`,
            updated: results
        });

    } catch (err) {
        console.error("Backfill Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
