import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { updateCommentSchema } from "@/lib/validations/board";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; commentId: string }> };

/** PATCH /api/board/posts/[id]/comments/[commentId] — 댓글 수정 */
export async function PATCH(request: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    const { commentId } = await params;

    const comment = await prisma.boardComment.findUnique({
        where: { id: commentId },
        select: { authorId: true },
    });
    if (!comment) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다." } },
            { status: 404 },
        );
    }
    if (comment.authorId !== user.id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "본인의 댓글만 수정할 수 있습니다." } },
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

    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: {
                    code: "VALIDATION_ERROR",
                    message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
                },
            },
            { status: 400 },
        );
    }

    const updated = await prisma.boardComment.update({
        where: { id: commentId },
        data: { content: parsed.data.content, isEdited: true, editedAt: new Date() },
        include: {
            author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
        },
    });

    return NextResponse.json({ data: updated });
}

/** DELETE /api/board/posts/[id]/comments/[commentId] — 댓글 삭제 (soft delete) */
export async function DELETE(_request: NextRequest, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 },
        );
    }

    const { commentId } = await params;

    const comment = await prisma.boardComment.findUnique({
        where: { id: commentId },
        select: { authorId: true, postId: true },
    });
    if (!comment) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다." } },
            { status: 404 },
        );
    }
    if (comment.authorId !== user.id && user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "삭제 권한이 없습니다." } },
            { status: 403 },
        );
    }

    await prisma.$transaction([
        prisma.boardComment.update({ where: { id: commentId }, data: { isHidden: true } }),
        prisma.boardPost.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
    ]);

    return NextResponse.json({ data: { success: true } });
}
