import { NextResponse } from "next/server";
import { z } from "zod";
import { SubmissionStatus, AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";

const bulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, "최소 1개의 제출물 ID가 필요합니다.").max(50, "한 번에 최대 50개까지 처리할 수 있습니다."),
  action: z.enum(["APPROVE", "REJECT"], { message: "APPROVE 또는 REJECT만 가능합니다." }),
  reason: z.string().max(500, "사유는 500자 이내여야 합니다.").optional(),
});

const APPROVABLE_STATUSES: SubmissionStatus[] = [
  SubmissionStatus.PENDING,
  SubmissionStatus.IN_REVIEW,
  SubmissionStatus.REVISED,
];

export async function POST(request: Request) {
  // 1. 인증
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  // 2. 권한
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  // 3. 요청 파싱
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  // 4. 검증
  const parsed = bulkActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const { ids, action, reason } = parsed.data;

  // 5. 개별 처리 (partial success 허용)
  let approved = 0;
  let rejected = 0;
  const failed: string[] = [];

  for (const id of ids) {
    try {
      if (action === "APPROVE") {
        const result = await processApprove(id, user.id);
        if (result === "approved") approved++;
        // "skipped" → 이미 처리된 항목, 카운트하지 않음
      } else {
        const result = await processReject(id, user.id, reason);
        if (result === "rejected") rejected++;
      }
    } catch {
      failed.push(id);
    }
  }

  void createAuditLog({
    actorId: user.id,
    action: "BULK_ACTION_SUBMISSIONS",
    entityType: "Submission",
    entityId: "bulk",
    metadata: { bulkAction: action, total: ids.length },
  });

  // 6. 응답
  return NextResponse.json({
    data: { approved, rejected, failed },
  });
}

async function processApprove(
  id: string,
  reviewerId: string
): Promise<"approved" | "skipped"> {
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      assignmentId: true,
      videoId: true,
    },
  });

  if (!submission) {
    throw new Error("제출물을 찾을 수 없습니다.");
  }

  // 이미 승인/반려된 항목은 스킵
  if (
    submission.status === SubmissionStatus.APPROVED ||
    submission.status === SubmissionStatus.REJECTED
  ) {
    return "skipped";
  }

  // 승인 가능한 상태인지 확인
  if (!APPROVABLE_STATUSES.includes(submission.status)) {
    throw new Error("승인할 수 없는 상태입니다.");
  }

  // 제출물 승인 처리
  await prisma.submission.update({
    where: { id },
    data: {
      status: SubmissionStatus.APPROVED,
      reviewerId,
      approvedAt: new Date(),
    },
  });

  // 배정이 있으면 COMPLETED로 변경
  if (submission.assignmentId) {
    await prisma.projectAssignment.update({
      where: { id: submission.assignmentId },
      data: { status: AssignmentStatus.COMPLETED },
    });
  }

  // Video 상태를 APPROVED로 변경 + EventLog 기록
  if (submission.videoId) {
    const video = await prisma.video.findUnique({
      where: { id: submission.videoId },
      select: { status: true },
    });

    await prisma.video.update({
      where: { id: submission.videoId },
      data: { status: "APPROVED" },
    });

    try {
      await prisma.videoEventLog.create({
        data: {
          videoId: submission.videoId,
          event: "SUBMISSION_APPROVED",
          fromState: video?.status ?? null,
          toState: "APPROVED",
          metadata: { submissionId: id, reviewerId },
        },
      });
    } catch {
      // 로그 생성 실패는 무시
    }
  }

  return "approved";
}

async function processReject(
  id: string,
  reviewerId: string,
  reason?: string
): Promise<"rejected" | "skipped"> {
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      videoId: true,
    },
  });

  if (!submission) {
    throw new Error("제출물을 찾을 수 없습니다.");
  }

  // 이미 승인/반려된 항목은 스킵
  if (
    submission.status === SubmissionStatus.APPROVED ||
    submission.status === SubmissionStatus.REJECTED
  ) {
    return "skipped";
  }

  // 제출물 반려 처리
  await prisma.submission.update({
    where: { id },
    data: {
      status: SubmissionStatus.REJECTED,
      reviewerId,
      reviewedAt: new Date(),
      summaryFeedback: reason || null,
    },
  });

  // Video 상태를 DRAFT로 되돌림 + EventLog 기록
  if (submission.videoId) {
    const video = await prisma.video.findUnique({
      where: { id: submission.videoId },
      select: { status: true },
    });

    await prisma.video.update({
      where: { id: submission.videoId },
      data: { status: "DRAFT" },
    });

    try {
      await prisma.videoEventLog.create({
        data: {
          videoId: submission.videoId,
          event: "SUBMISSION_REJECTED",
          fromState: video?.status ?? null,
          toState: "DRAFT",
          metadata: { submissionId: id, reviewerId, reason: reason || null },
        },
      });
    } catch {
      // 로그 생성 실패는 무시
    }
  }

  return "rejected";
}
