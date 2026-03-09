import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/** Lock 만료 시간 (밀리초) — 30분 */
const LOCK_TTL_MS = 30 * 60 * 1000;

/**
 * POST /api/submissions/[id]/lock
 *
 * 리뷰 시작 시 호출하여 동시 리뷰를 방지합니다.
 * Lock은 30분 후 자동 만료됩니다.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    const submission = await prisma.submission.findUnique({
        where: { id },
        select: { id: true, lockedBy: true, lockedAt: true },
    });

    if (!submission) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    // 이미 다른 사람이 lock을 잡고 있고, 아직 만료되지 않았다면
    if (
        submission.lockedBy &&
        submission.lockedBy !== user.id &&
        submission.lockedAt &&
        Date.now() - new Date(submission.lockedAt).getTime() < LOCK_TTL_MS
    ) {
        // 누가 lock 중인지 알려줌
        const locker = await prisma.user.findUnique({
            where: { id: submission.lockedBy },
            select: { name: true },
        });

        return NextResponse.json(
            {
                error: {
                    code: "LOCKED",
                    message: `${locker?.name ?? "다른 관리자"}님이 현재 리뷰 중입니다.`,
                },
                lockedBy: submission.lockedBy,
                lockedAt: submission.lockedAt,
            },
            { status: 409 }
        );
    }

    // Lock 획득 (또는 갱신)
    const updated = await prisma.submission.update({
        where: { id },
        data: {
            lockedBy: user.id,
            lockedAt: new Date(),
        },
        select: { id: true, lockedBy: true, lockedAt: true },
    });

    return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/submissions/[id]/lock
 *
 * 리뷰 종료 시 호출하여 lock을 해제합니다.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user || user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "관리자 인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    // 본인의 lock만 해제 가능
    await prisma.submission.updateMany({
        where: {
            id,
            lockedBy: user.id,
        },
        data: {
            lockedBy: null,
            lockedAt: null,
        },
    });

    return NextResponse.json({ message: "Lock이 해제되었습니다." });
}
