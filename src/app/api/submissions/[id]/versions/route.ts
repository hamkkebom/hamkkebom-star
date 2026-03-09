import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/submissions/[id]/versions
 *
 * 같은 비디오의 모든 제출 버전 목록 (비교 뷰용)
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 현재 제출물 조회
    const submission = await prisma.submission.findUnique({
        where: { id },
        select: {
            id: true,
            videoId: true,
            assignmentId: true,
            starId: true,
        },
    });

    if (!submission) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // 같은 비디오 또는 같은 과제의 모든 버전
    const versions = await prisma.submission.findMany({
        where: submission.assignmentId
            ? { assignmentId: submission.assignmentId }
            : { videoId: submission.videoId, starId: submission.starId },
        select: {
            id: true,
            version: true,
            versionSlot: true,
            versionTitle: true,
            streamUid: true,
            status: true,
            createdAt: true,
            thumbnailUrl: true,
            _count: {
                select: { feedbacks: true },
            },
        },
        orderBy: { versionSlot: "asc" },
    });

    return NextResponse.json({
        data: {
            currentId: id,
            versions,
        },
    });
}
