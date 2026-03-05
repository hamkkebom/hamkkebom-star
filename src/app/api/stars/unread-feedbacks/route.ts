import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * 스타의 미확인(PENDING) 피드백 총 개수를 반환합니다.
 * 바텀 네비게이션 뱃지에서 사용됩니다.
 */
export async function GET() {
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

    // 스타의 모든 제출물에 달린 PENDING 피드백 개수
    const unreadCount = await prisma.feedback.count({
        where: {
            submission: {
                starId: user.id,
            },
            status: "PENDING",
        },
    });

    return NextResponse.json({
        data: { unreadCount },
    });
}
