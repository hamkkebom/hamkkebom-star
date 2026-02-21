import { NextResponse } from "next/server";
import { SubmissionStatus, AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }
    if (user.role !== "ADMIN") {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "관리자만 승인/반려를 취소할 수 있습니다." } },
            { status: 403 }
        );
    }

    const { id } = await params;

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const submission = await tx.submission.findUnique({
                where: { id },
                select: { id: true, status: true, assignmentId: true, videoId: true },
            });

            if (!submission) {
                throw { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다.", status: 404 };
            }

            if (submission.status !== SubmissionStatus.APPROVED && submission.status !== SubmissionStatus.REJECTED) {
                throw { code: "BAD_REQUEST", message: "진행 중인 상태로만 되돌릴 수 있습니다. (승인 또는 반려 상태에서만 가능)", status: 400 };
            }

            // 달린 피드백 개수에 따라 PENDING / IN_REVIEW 결정
            const feedbackCount = await tx.feedback.count({
                where: { submissionId: id },
            });

            const newStatus = feedbackCount > 0 ? SubmissionStatus.IN_REVIEW : SubmissionStatus.PENDING;

            const result = await tx.submission.update({
                where: { id },
                data: {
                    status: newStatus,
                    reviewerId: null,
                    approvedAt: null,
                    reviewedAt: null,
                    summaryFeedback: null, // 반려 시 남겼던 사유 초기화
                },
                include: {
                    star: { select: { id: true, name: true, email: true } },
                },
            });

            // 배정이 있으면 진행 중(IN_PROGRESS)로 되돌림
            if (submission.assignmentId) {
                await tx.projectAssignment.update({
                    where: { id: submission.assignmentId },
                    data: { status: AssignmentStatus.IN_PROGRESS },
                });
            }

            // Video.status를 DRAFT로 되돌려 메인에서 비공개 처리
            if (submission.videoId) {
                await tx.video.update({
                    where: { id: submission.videoId },
                    data: { status: "DRAFT" },
                });
            }

            return result;
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
            { error: { code: "INTERNAL_ERROR", message: "취소 처리 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}
