import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/board/posts/[id]/comments/[commentId]/like — 댓글 좋아요 토글 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; commentId: string }> },
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    const { commentId } = await params;

    const existing = await prisma.boardCommentLike.findUnique({
        where: { userId_commentId: { userId: user.id, commentId } },
    });

    if (existing) {
        await prisma.$transaction([
            prisma.boardCommentLike.delete({ where: { id: existing.id } }),
            prisma.boardComment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ data: { liked: false } });
    } else {
        await prisma.$transaction([
            prisma.boardCommentLike.create({ data: { userId: user.id, commentId } }),
            prisma.boardComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
        ]);
        return NextResponse.json({ data: { liked: true } });
    }
}
