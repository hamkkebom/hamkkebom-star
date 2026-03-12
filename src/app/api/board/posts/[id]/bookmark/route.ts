import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/board/posts/[id]/bookmark — 북마크 토글 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    const { id: postId } = await params;

    const existing = await prisma.boardPostBookmark.findUnique({
        where: { userId_postId: { userId: user.id, postId } },
    });

    if (existing) {
        await prisma.boardPostBookmark.delete({ where: { id: existing.id } });
        return NextResponse.json({ data: { bookmarked: false } });
    } else {
        await prisma.boardPostBookmark.create({
            data: { userId: user.id, postId },
        });
        return NextResponse.json({ data: { bookmarked: true } });
    }
}

/** GET /api/board/posts/[id]/bookmark — 북마크 상태 확인 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ data: { bookmarked: false } });
    }

    const { id: postId } = await params;

    const existing = await prisma.boardPostBookmark.findUnique({
        where: { userId_postId: { userId: user.id, postId } },
    });

    return NextResponse.json({ data: { bookmarked: !!existing } });
}
