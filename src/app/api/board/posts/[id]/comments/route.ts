import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/board/posts/[id]/comments — 게시글 댓글 작성 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: postId } = await params;
    const { content, parentId } = await request.json();

    if (!content?.trim()) {
        return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const comment = await prisma.boardComment.create({
        data: {
            postId,
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
