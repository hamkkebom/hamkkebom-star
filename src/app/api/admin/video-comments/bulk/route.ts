import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { commentBulkSchema } from "@/lib/validations/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/video-comments/bulk — 영상 댓글 일괄 처리 */
export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 },
    );
  }

  const parsed = commentBulkSchema.safeParse(body);
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

  const { commentIds, action } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let count = 0;

    if (action === "HIDE") {
      const updated = await tx.videoComment.updateMany({
        where: { id: { in: commentIds } },
        data: { isHidden: true },
      });
      count = updated.count;
    } else if (action === "UNHIDE") {
      const updated = await tx.videoComment.updateMany({
        where: { id: { in: commentIds } },
        data: { isHidden: false },
      });
      count = updated.count;
    } else if (action === "DELETE") {
      const deleted = await tx.videoComment.deleteMany({
        where: { id: { in: commentIds } },
      });
      count = deleted.count;
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `VIDEO_COMMENT_BULK_${action}`,
        entityType: "VideoComment",
        entityId: commentIds.join(","),
        changes: { commentIds, action },
      },
    });

    return count;
  });

  return NextResponse.json({
    data: { count: result },
  });
}
