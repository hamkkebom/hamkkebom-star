import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { reportBulkActionSchema } from "@/lib/validations/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/reports/bulk — 신고 일괄 처리 (DISMISS, ASSIGN, ESCALATE) */
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

  const parsed = reportBulkActionSchema.safeParse(body);
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

  const { reportIds, action, assignedTo, reason } = parsed.data;
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let updateData: Record<string, unknown> = {};

    if (action === "DISMISS") {
      updateData = {
        status: "DISMISSED",
        resolutionAction: "BULK_DISMISS",
        resolutionNote: reason ?? "일괄 기각 처리",
        resolvedBy: user.id,
        resolvedAt: now,
      };
    } else if (action === "ASSIGN") {
      if (!assignedTo) {
        throw new Error("ASSIGN_NO_TARGET");
      }
      updateData = {
        status: "UNDER_REVIEW",
        assignedTo,
      };
    } else if (action === "ESCALATE") {
      updateData = {
        status: "ESCALATED",
        resolutionNote: reason ?? null,
      };
    }

    const updated = await tx.report.updateMany({
      where: { id: { in: reportIds } },
      data: updateData,
    });

    // Create AuditLog for bulk action
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: `REPORT_BULK_${action}`,
        entityType: "Report",
        entityId: reportIds.join(","),
        changes: {
          reportIds,
          action,
          assignedTo: assignedTo ?? null,
          reason: reason ?? null,
        },
      },
    });

    return updated;
  });

  return NextResponse.json({
    data: { count: result.count },
  });
}
