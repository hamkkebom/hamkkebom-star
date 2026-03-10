import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/board/posts/[id]/like — 게시글 좋아요 토글 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId } = await params;

    const existing = await prisma.boardPostLike.findUnique({
        where: { userId_postId: { userId: user.id, postId } },
    });

    if (existing) {
        await prisma.$transaction([
            prisma.boardPostLike.delete({ where: { id: existing.id } }),
            prisma.boardPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
        ]);
        return NextResponse.json({ liked: false });
    } else {
        await prisma.$transaction([
            prisma.boardPostLike.create({ data: { userId: user.id, postId } }),
            prisma.boardPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
        ]);
        return NextResponse.json({ liked: true });
    }
}
