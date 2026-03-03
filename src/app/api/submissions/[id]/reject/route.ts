import { NextResponse } from "next/server";
import { SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

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
      { error: { code: "FORBIDDEN", message: "관리자만 반려할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let reason = "";
  try {
    const body = await request.json();
    reason = body.reason ?? "";
  } catch {
    // reason은 선택사항
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.findUnique({
        where: { id },
        select: { id: true, videoId: true, status: true },
      });

      if (!submission) {
        throw { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다.", status: 404 };
      }

      const result = await tx.submission.update({
        where: { id },
        data: {
          status: SubmissionStatus.REJECTED,
          reviewerId: user.id,
          reviewedAt: new Date(),
          summaryFeedback: reason || null,
        },
        include: {
          star: { select: { id: true, name: true, email: true } },
        },
      });

      // Video.status를 DRAFT로 되돌려 메인에서 비공개 처리
      if (submission.videoId) {
        const video = await tx.video.findUnique({
          where: { id: submission.videoId },
          select: { status: true },
        });

        await tx.video.update({
          where: { id: submission.videoId },
          data: { status: "DRAFT" },
        });

        // VideoEventLog 기록 (실패해도 메인 로직에 영향 없음)
        try {
          await tx.videoEventLog.create({
            data: {
              videoId: submission.videoId,
              event: "SUBMISSION_REJECTED",
              fromState: video?.status ?? null,
              toState: "DRAFT",
              metadata: { submissionId: id, reviewerId: user.id, reason: reason || null },
            },
          });
        } catch {
          // 로그 생성 실패는 무시
        }
      }

      return result;
    });

    void createAuditLog({ actorId: user.id, action: "REJECT_SUBMISSION", entityType: "Submission", entityId: id });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
}
