import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * 스타가 특정 제출물의 피드백을 확인(읽음) 처리합니다.
 * POST /api/stars/feedbacks/mark-seen
 * body: { submissionId: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    if (user.role !== "STAR") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "STAR만 접근할 수 있습니다." } },
            { status: 403 }
        );
    }

    const body = await req.json();
    const { submissionId } = body;

    if (!submissionId) {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "submissionId가 필요합니다." } },
            { status: 400 }
        );
    }

    // 해당 submission이 본인 소유인지 확인
    const submission = await prisma.submission.findFirst({
        where: {
            id: submissionId,
            starId: user.id,
        },
    });

    if (!submission) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    // 해당 제출물의 아직 미확인(seenByStarAt이 null)인 피드백 일괄 업데이트
    const result = await prisma.feedback.updateMany({
        where: {
            submissionId,
            seenByStarAt: null,
        },
        data: {
            seenByStarAt: new Date(),
        },
    });

    return NextResponse.json({
        data: { markedCount: result.count },
    });
}
