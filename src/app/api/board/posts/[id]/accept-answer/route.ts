import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** POST /api/board/posts/[id]/accept-answer — Q&A 답변 채택 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthUser();
	if (!user) {
		return NextResponse.json(
			{ error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
			{ status: 401 },
		);
	}

	const { id } = await params;
	const post = await prisma.boardPost.findUnique({
		where: { id },
		select: { authorId: true, boardType: true },
	});

	if (!post) {
		return NextResponse.json(
			{ error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." } },
			{ status: 404 },
		);
	}

	if (post.boardType !== "QNA") {
		return NextResponse.json(
			{ error: { code: "BAD_REQUEST", message: "Q&A 게시글만 답변을 채택할 수 있습니다." } },
			{ status: 400 },
		);
	}

	if (post.authorId !== user.id) {
		return NextResponse.json(
			{ error: { code: "FORBIDDEN", message: "본인의 질문에만 답변을 채택할 수 있습니다." } },
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

	const { commentId } = body as { commentId?: string };
	if (!commentId) {
		return NextResponse.json(
			{ error: { code: "VALIDATION_ERROR", message: "댓글 ID를 입력해주세요." } },
			{ status: 400 },
		);
	}

	// Verify comment exists and belongs to this post
	const comment = await prisma.boardComment.findUnique({
		where: { id: commentId },
		select: { postId: true },
	});
	if (!comment || comment.postId !== id) {
		return NextResponse.json(
			{ error: { code: "NOT_FOUND", message: "해당 게시글의 댓글을 찾을 수 없습니다." } },
			{ status: 404 },
		);
	}

	const updated = await prisma.boardPost.update({
		where: { id },
		data: { acceptedAnswerId: commentId },
		include: {
			author: { select: { id: true, name: true, chineseName: true, avatarUrl: true, role: true } },
		},
	});

	return NextResponse.json({ data: updated });
}
