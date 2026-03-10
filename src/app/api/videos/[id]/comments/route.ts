import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/videos/[id]/comments — 댓글 목록 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "latest";
    const cursor = searchParams.get("cursor");
    const limit = Math.min(30, Number(searchParams.get("limit") || "20"));
    const user = await getAuthUser().catch(() => null);

    const comments = await prisma.videoComment.findMany({
        where: { videoId, parentId: null, isHidden: false },
        orderBy: sort === "popular" ? { likeCount: "desc" } : { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
            children: {
                where: { isHidden: false },
                orderBy: { createdAt: "asc" },
                take: 3,
                include: {
                    author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
                },
            },
            _count: { select: { children: true, likes: true } },
        },
    });

    const hasMore = comments.length > limit;
    const data = comments.slice(0, limit);
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    // 현재 사용자의 좋아요 여부
    let likedCommentIds: Set<string> = new Set();
    if (user) {
        const likes = await prisma.commentLike.findMany({
            where: { userId: user.id, commentId: { in: data.map(c => c.id) } },
            select: { commentId: true },
        });
        likedCommentIds = new Set(likes.map(l => l.commentId));
    }

    const totalCount = await prisma.videoComment.count({ where: { videoId, parentId: null, isHidden: false } });

    return NextResponse.json({
        data: data.map(c => ({ ...c, isLiked: likedCommentIds.has(c.id) })),
        nextCursor,
        hasMore,
        totalCount,
    });
}

/** POST /api/videos/[id]/comments — 댓글 작성 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: videoId } = await params;
    const { content, parentId } = await request.json();

    if (!content?.trim()) {
        return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const comment = await prisma.videoComment.create({
        data: {
            videoId,
            authorId: user.id,
            content: content.trim(),
            parentId: parentId || null,
        },
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
        },
    });

    return NextResponse.json(comment, { status: 201 });
}
