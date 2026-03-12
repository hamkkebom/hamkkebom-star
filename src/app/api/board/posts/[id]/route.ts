import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { updatePostSchema } from "@/lib/validations/board";
import { renderTiptapContent } from "@/lib/tiptap-renderer";

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

    // contentJson이 있으면 HTML 렌더링해서 함께 반환
    const contentHtml = post.contentJson ? renderTiptapContent(post.contentJson) : null;

    return NextResponse.json({ data: { ...post, viewCount: post.viewCount + 1, contentHtml } });
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

/** PATCH /api/board/posts/[id] — 게시글 수정 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    const { id } = await params;
    const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." } },
            { status: 404 },
        );
    }

    // Only author can edit
    if (post.authorId !== user.id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "본인의 게시글만 수정할 수 있습니다." } },
            { status: 403 },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
            { status: 400 },
        );
    }

    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
            { status: 400 },
        );
    }

    // Only ADMIN can set isPinned/isNotice
    const { isPinned, isNotice, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest, isEdited: true, editedAt: new Date() };
    if (user.role === "ADMIN") {
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (isNotice !== undefined) updateData.isNotice = isNotice;
    }

    const updated = await prisma.boardPost.update({
        where: { id },
        data: updateData,
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
            _count: { select: { comments: true, likes: true } },
        },
    });

    return NextResponse.json({ data: updated });
}
