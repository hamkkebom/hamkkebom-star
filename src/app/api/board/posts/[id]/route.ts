import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/board/posts/[id] — 게시글 상세 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const post = await prisma.boardPost.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
            comments: {
                where: { isHidden: false, parentId: null },
                orderBy: { createdAt: "desc" },
                take: 50,
                include: {
                    author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
                    children: {
                        where: { isHidden: false },
                        orderBy: { createdAt: "asc" },
                        include: {
                            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
                        },
                    },
                },
            },
            _count: { select: { comments: true, likes: true } },
        },
    });

    if (!post || post.isHidden) {
        return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    // 조회수 증가
    await prisma.boardPost.update({ where: { id }, data: { viewCount: { increment: 1 } } });

    return NextResponse.json({ data: { ...post, viewCount: post.viewCount + 1 } });
}

/** DELETE /api/board/posts/[id] — 게시글 삭제 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } });

    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.authorId !== user.id && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.boardPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
}
