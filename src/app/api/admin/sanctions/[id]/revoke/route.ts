import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { sanctionRevokeSchema } from "@/lib/validations/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/sanctions/[id]/revoke — 제재 해제 */
export async function POST(
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

  const parsed = sanctionRevokeSchema.safeParse(body);
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

  const { reason } = parsed.data;

  const sanction = await prisma.userSanction.findUnique({
    where: { id },
    select: { id: true, userId: true, type: true, isActive: true },
  });

  if (!sanction) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제재 기록을 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  if (!sanction.isActive) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "이미 해제된 제재입니다.",
        },
      },
      { status: 400 },
    );
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Deactivate sanction
    const updatedSanction = await tx.userSanction.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: now,
        revokedById: user.id,
        revokeReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Reverse user fields based on sanction type
    if (sanction.type === "PERM_BAN") {
      await tx.user.update({
        where: { id: sanction.userId },
        data: {
          isBanned: false,
          bannedAt: null,
          bannedReason: null,
        },
      });
    } else if (
      sanction.type === "TEMP_RESTRICT" ||
      sanction.type === "TEMP_BAN"
    ) {
      await tx.user.update({
        where: { id: sanction.userId },
        data: {
          suspendedUntil: null,
          suspendedReason: null,
        },
      });
    }

    // Create AuditLog
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "SANCTION_REVOKE",
        entityType: "UserSanction",
        entityId: id,
        changes: {
          sanctionType: sanction.type,
          userId: sanction.userId,
          revokeReason: reason,
        },
      },
    });

    return updatedSanction;
  });

  return NextResponse.json({ data: result });
}
