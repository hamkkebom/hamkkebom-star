import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { boardPostBulkSchema } from "@/lib/validations/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/board-posts/bulk — 게시글 일괄 처리 */
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

  const parsed = boardPostBulkSchema.safeParse(body);
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

  const { postIds, action } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let count = 0;

    if (action === "HIDE") {
      const updated = await tx.boardPost.updateMany({
        where: { id: { in: postIds } },
        data: { isHidden: true },
      });
      count = updated.count;
    } else if (action === "UNHIDE") {
      const updated = await tx.boardPost.updateMany({
        where: { id: { in: postIds } },
        data: { isHidden: false },
      });
      count = updated.count;
    } else if (action === "PIN") {
      const updated = await tx.boardPost.updateMany({
        where: { id: { in: postIds } },
        data: { isPinned: true },
      });
      count = updated.count;
    } else if (action === "UNPIN") {
      const updated = await tx.boardPost.updateMany({
        where: { id: { in: postIds } },
        data: { isPinned: false },
      });
      count = updated.count;
    } else if (action === "DELETE") {
      const deleted = await tx.boardPost.deleteMany({
        where: { id: { in: postIds } },
      });
      count = deleted.count;
    }

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `POST_BULK_${action}`,
        entityType: "BoardPost",
        entityId: postIds.join(","),
        changes: { postIds, action },
      },
    });

    return count;
  });

  return NextResponse.json({
    data: { count: result },
  });
}
