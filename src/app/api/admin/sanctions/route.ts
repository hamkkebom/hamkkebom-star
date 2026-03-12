import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { manualSanctionSchema } from "@/lib/validations/moderation";
import { SanctionType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/admin/sanctions — 제재 목록 (필터/페이지네이션) */
export async function GET(request: NextRequest) {
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

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const isActive = url.searchParams.get("isActive");
  const userId = url.searchParams.get("userId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "20")),
  );

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;
  if (userId) where.userId = userId;

  const [sanctions, total] = await Promise.all([
    prisma.userSanction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
        appliedBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.userSanction.count({ where }),
  ]);

  return NextResponse.json({
    data: sanctions,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

/** POST /api/admin/sanctions — 수동 제재 생성 */
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

  const parsed = manualSanctionSchema.safeParse(body);
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

  const { userId: targetUserId, type, reason, duration, internalNote } =
    parsed.data;

  // Validate target user exists and is not ADMIN
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "대상 사용자를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }

  if (targetUser.role === "ADMIN") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "관리자 계정에는 제재를 적용할 수 없습니다.",
        },
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const sanctionType = type as SanctionType;

  const result = await prisma.$transaction(async (tx) => {
    // Calculate endAt for time-based sanctions
    let endAt: Date | null = null;
    if (
      (sanctionType === "TEMP_RESTRICT" || sanctionType === "TEMP_BAN") &&
      duration
    ) {
      endAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    }

    // Update user fields based on sanction type
    if (sanctionType === "WARNING") {
      await tx.user.update({
        where: { id: targetUserId },
        data: { warningCount: { increment: 1 } },
      });
    } else if (
      sanctionType === "TEMP_RESTRICT" ||
      sanctionType === "TEMP_BAN"
    ) {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          suspendedUntil: endAt,
          suspendedReason: reason,
        },
      });
    } else if (sanctionType === "PERM_BAN") {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          isBanned: true,
          bannedAt: now,
          bannedReason: reason,
        },
      });
    }

    // Create sanction record
    const sanction = await tx.userSanction.create({
      data: {
        userId: targetUserId,
        type: sanctionType,
        reason,
        internalNote: internalNote ?? null,
        startAt: now,
        endAt,
        appliedById: user.id,
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
        appliedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Create AuditLog
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "MANUAL_SANCTION_CREATE",
        entityType: "UserSanction",
        entityId: sanction.id,
        changes: {
          userId: targetUserId,
          type: sanctionType,
          reason,
          duration: duration ?? null,
        },
      },
    });

    return sanction;
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
