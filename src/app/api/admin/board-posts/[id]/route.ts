import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { boardPostUpdateSchema } from "@/lib/validations/moderation";

export const dynamic = "force-dynamic";

/** GET /api/admin/board-posts/[id] — 게시글 상세 */
export async function GET(
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
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  const [post, reportCount] = await Promise.all([
    prisma.boardPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        comments: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            bookmarks: true,
          },
        },
      },
    }),
    prisma.report.count({
      where: { targetType: "POST", targetId: id },
    }),
  ]);

  if (!post) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: { ...post, reportCount },
  });
}

/** PATCH /api/admin/board-posts/[id] — 게시글 상태 변경 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 },
    );
  }

  const parsed = boardPostUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const existing = await prisma.boardPost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  const post = await prisma.boardPost.update({
    where: { id },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "UPDATE_POST",
      entityType: "BoardPost",
      entityId: id,
      changes: parsed.data,
    },
  });

  return NextResponse.json({ data: post });
}

/** DELETE /api/admin/board-posts/[id] — 게시글 삭제 */
export async function DELETE(
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
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    );
  }

  const { id } = await params;

  const existing = await prisma.boardPost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "게시글을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  await prisma.boardPost.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "DELETE_POST",
      entityType: "BoardPost",
      entityId: id,
      changes: {
        title: existing.title,
        boardType: existing.boardType,
        authorId: existing.authorId,
      },
    },
  });

  return NextResponse.json({ data: { success: true } });
}
