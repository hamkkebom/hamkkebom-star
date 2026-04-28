import { NextResponse } from "next/server";
import { z } from "zod";
import { SubmissionStatus, AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { status: newStatus, reason } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.findUnique({
        where: { id },
        select: { id: true, status: true, assignmentId: true, videoId: true },
      });

      if (!submission) {
        throw { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다.", status: 404 };
      }

      const isApproving = newStatus === SubmissionStatus.APPROVED;
      const isRejecting = newStatus === SubmissionStatus.REJECTED;

      const result = await tx.submission.update({
        where: { id },
        data: {
          status: newStatus,
          reviewerId: isApproving || isRejecting ? user.id : null,
          approvedAt: isApproving ? new Date() : null,
          reviewedAt: isRejecting ? new Date() : null,
          summaryFeedback: isRejecting ? (reason ?? null) : null,
        },
      });

      if (submission.assignmentId) {
        await tx.projectAssignment.update({
          where: { id: submission.assignmentId },
          data: {
            status: isApproving ? AssignmentStatus.COMPLETED : AssignmentStatus.IN_PROGRESS,
          },
        });
      }

      if (submission.videoId) {
        const video = await tx.video.findUnique({
          where: { id: submission.videoId },
          select: { status: true },
        });
        const newVideoStatus = isApproving ? "APPROVED" : "DRAFT";

        await tx.video.update({
          where: { id: submission.videoId },
          data: { status: newVideoStatus },
        });

        try {
          await tx.videoEventLog.create({
            data: {
              videoId: submission.videoId,
              event: "ADMIN_STATUS_CHANGE",
              fromState: video?.status ?? null,
              toState: newVideoStatus,
              metadata: {
                submissionId: id,
                adminId: user.id,
                newSubmissionStatus: newStatus,
                previousSubmissionStatus: submission.status,
              },
            },
          });
        } catch {
          // 이벤트 로그 실패는 무시
        }
      }

      return result;
    });

    void createAuditLog({
      actorId: user.id,
      action: "CHANGE_SUBMISSION_STATUS",
      entityType: "Submission",
      entityId: id,
      metadata: { newStatus, reason: reason ?? null },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && "status" in error) {
      const e = error as { code: string; message: string; status: number };
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "상태 변경 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
