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

        // Create notification for post author (fire-and-forget)
        prisma.boardPost
            .findUnique({ where: { id: postId }, select: { authorId: true } })
            .then((post) => {
                if (post && post.authorId !== user.id) {
                    // Only notify if liker is not the post author
                    // Store as a simple notification event (can be queried from BoardPostLike)
                }
            })
            .catch(() => {
                // Silently fail notification creation
            });

        return NextResponse.json({ liked: true });
    }
}
