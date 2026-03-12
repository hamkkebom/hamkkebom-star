import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const videoCommentUpdateSchema = z.object({
  isHidden: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

/** PATCH /api/admin/video-comments/[id] — 영상 댓글 상태 변경 */
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

  const parsed = videoCommentUpdateSchema.safeParse(body);
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

  const existing = await prisma.videoComment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  const comment = await prisma.videoComment.update({
    where: { id },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "UPDATE_VIDEO_COMMENT",
      entityType: "VideoComment",
      entityId: id,
      changes: parsed.data,
    },
  });

  return NextResponse.json({ data: comment });
}

/** DELETE /api/admin/video-comments/[id] — 영상 댓글 삭제 */
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

  const existing = await prisma.videoComment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  await prisma.videoComment.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "DELETE_VIDEO_COMMENT",
      entityType: "VideoComment",
      entityId: id,
      changes: {
        videoId: existing.videoId,
        authorId: existing.authorId,
        content: existing.content,
      },
    },
  });

  return NextResponse.json({ data: { success: true } });
}
