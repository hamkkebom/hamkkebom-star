import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { reportActionSchema } from "@/lib/validations/moderation";
import { ReportStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** POST /api/admin/reports/[id]/action — 신고 조치 (제재 + 콘텐츠 처리) */
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

  const parsed = reportActionSchema.safeParse(body);
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

  const { actionType, duration, reason, internalNote } = parsed.data;

  // Validate report exists and is not already resolved
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "신고를 찾을 수 없습니다." } },
      { status: 404 },
    );
  }
  if (report.status === "RESOLVED" || report.status === "DISMISSED") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "이미 처리된 신고입니다.",
        },
      },
      { status: 400 },
    );
  }

  // Determine reported user ID from target
  let reportedUserId: string | null = null;

  if (report.targetType === "USER") {
    reportedUserId = report.targetId;
  } else if (report.targetType === "POST") {
    const post = await prisma.boardPost.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    reportedUserId = post?.authorId ?? null;
  } else if (report.targetType === "COMMENT") {
    const boardComment = await prisma.boardComment.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    if (boardComment) {
      reportedUserId = boardComment.authorId;
    } else {
      const videoComment = await prisma.videoComment.findUnique({
        where: { id: report.targetId },
        select: { authorId: true },
      });
      reportedUserId = videoComment?.authorId ?? null;
    }
  } else if (report.targetType === "VIDEO") {
    const video = await prisma.video.findUnique({
      where: { id: report.targetId },
      select: { ownerId: true },
    });
    reportedUserId = video?.ownerId ?? null;
  }

  // For BAN action, check target user is not ADMIN
  if (actionType === "BAN" && reportedUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
      select: { role: true },
    });
    if (targetUser?.role === "ADMIN") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "관리자 계정은 영구 정지할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Map actionType to sanction type
    const sanctionTypeMap: Record<string, string> = {
      WARN: "WARNING",
      HIDE_CONTENT: "CONTENT_HIDDEN",
      REMOVE_CONTENT: "CONTENT_REMOVED",
      RESTRICT: "TEMP_RESTRICT",
      SUSPEND: "TEMP_BAN",
      BAN: "PERM_BAN",
    };

    let newStatus: ReportStatus = "RESOLVED";
    const resolutionAction = actionType;

    if (actionType === "DISMISS") {
      newStatus = "DISMISSED";
    }

    // Update report
    const updatedReport = await tx.report.update({
      where: { id },
      data: {
        status: newStatus,
        resolutionAction,
        resolutionNote: reason,
        resolvedBy: user.id,
        resolvedAt: now,
      },
    });

    // Apply side effects based on actionType
    if (actionType === "WARN" && reportedUserId) {
      await tx.user.update({
        where: { id: reportedUserId },
        data: { warningCount: { increment: 1 } },
      });
      await tx.userSanction.create({
        data: {
          userId: reportedUserId,
          type: "WARNING",
          reason,
          internalNote: internalNote ?? null,
          appliedById: user.id,
          reportId: id,
        },
      });
    } else if (actionType === "HIDE_CONTENT") {
      // Hide target content
      if (report.targetType === "POST") {
        await tx.boardPost
          .update({
            where: { id: report.targetId },
            data: { isHidden: true },
          })
          .catch(() => {});
      } else if (report.targetType === "COMMENT") {
        // Try BoardComment first, then VideoComment
        const boardResult = await tx.boardComment
          .update({
            where: { id: report.targetId },
            data: { isHidden: true },
          })
          .catch(() => null);

        if (!boardResult) {
          await tx.videoComment
            .update({
              where: { id: report.targetId },
              data: { isHidden: true },
            })
            .catch(() => {});
        }
      }
      // VIDEO type: no isHidden field, skip

      if (reportedUserId) {
        await tx.userSanction.create({
          data: {
            userId: reportedUserId,
            type: "CONTENT_HIDDEN",
            reason,
            internalNote: internalNote ?? null,
            appliedById: user.id,
            reportId: id,
          },
        });
      }
    } else if (actionType === "REMOVE_CONTENT") {
      // Delete target content
      if (report.targetType === "POST") {
        await tx.boardPost
          .delete({ where: { id: report.targetId } })
          .catch(() => {});
      } else if (report.targetType === "COMMENT") {
        const boardResult = await tx.boardComment
          .delete({ where: { id: report.targetId } })
          .catch(() => null);

        if (!boardResult) {
          await tx.videoComment
            .delete({ where: { id: report.targetId } })
            .catch(() => {});
        }
      }
      // VIDEO type: skip deletion (requires separate workflow)

      if (reportedUserId) {
        await tx.userSanction.create({
          data: {
            userId: reportedUserId,
            type: "CONTENT_REMOVED",
            reason,
            internalNote: internalNote ?? null,
            appliedById: user.id,
            reportId: id,
          },
        });
      }
    } else if (actionType === "RESTRICT" && reportedUserId && duration) {
      const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      await tx.user.update({
        where: { id: reportedUserId },
        data: {
          suspendedUntil: endDate,
          suspendedReason: reason,
        },
      });
      await tx.userSanction.create({
        data: {
          userId: reportedUserId,
          type: "TEMP_RESTRICT",
          reason,
          internalNote: internalNote ?? null,
          startAt: now,
          endAt: endDate,
          appliedById: user.id,
          reportId: id,
        },
      });
    } else if (actionType === "SUSPEND" && reportedUserId && duration) {
      const endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      await tx.user.update({
        where: { id: reportedUserId },
        data: {
          suspendedUntil: endDate,
          suspendedReason: reason,
        },
      });
      await tx.userSanction.create({
        data: {
          userId: reportedUserId,
          type: "TEMP_BAN",
          reason,
          internalNote: internalNote ?? null,
          startAt: now,
          endAt: endDate,
          appliedById: user.id,
          reportId: id,
        },
      });
    } else if (actionType === "BAN" && reportedUserId) {
      await tx.user.update({
        where: { id: reportedUserId },
        data: {
          isBanned: true,
          bannedAt: now,
          bannedReason: reason,
        },
      });
      await tx.userSanction.create({
        data: {
          userId: reportedUserId,
          type: "PERM_BAN",
          reason,
          internalNote: internalNote ?? null,
          appliedById: user.id,
          reportId: id,
        },
      });
    }

    // Create AuditLog entry
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `REPORT_ACTION_${actionType}`,
        entityType: "Report",
        entityId: id,
        changes: {
          actionType,
          reason,
          reportedUserId,
          targetType: report.targetType,
          targetId: report.targetId,
        },
        metadata: {
          duration: duration ?? null,
          internalNote: internalNote ?? null,
          sanctionType: sanctionTypeMap[actionType] ?? null,
        },
      },
    });

    // Resolve other PENDING reports with same targetType + targetId
    await tx.report.updateMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        id: { not: id },
        status: "PENDING",
      },
      data: {
        status: newStatus,
        resolutionAction: `AUTO_${resolutionAction}`,
        resolutionNote: `신고 #${id} 처리에 의해 자동 해결`,
        resolvedBy: user.id,
        resolvedAt: now,
      },
    });

    return updatedReport;
  });

  return NextResponse.json({ data: result });
}
