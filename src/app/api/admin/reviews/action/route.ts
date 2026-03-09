
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

// POST /api/admin/reviews/action
// body: { submissionId, action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNDO', feedback?: string }
export async function POST(req: NextRequest) {
    try {
        // ✅ getAuthUser() 사용 — 인증 캐시 활용
        const user = await getAuthUser();
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { submissionId, action, feedback, adEligible } = await req.json();

        if (!submissionId || !action) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // 트랜잭션 처리
        const result = await prisma.$transaction(async (tx) => {
            let newStatus = "PENDING";
            let reviewedAt: Date | null = new Date();
            let reviewerId: string | null = user.id;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            let summaryFeedback: string | undefined = feedback || undefined;

            if (action === "APPROVE") newStatus = "APPROVED";
            else if (action === "REJECT") newStatus = "REJECTED";
            else if (action === "REQUEST_CHANGES") newStatus = "REVISED";
            else if (action === "UNDO") {
                newStatus = "IN_REVIEW";
                reviewedAt = null;
                reviewerId = null;
                summaryFeedback = undefined;
            }

            // 1. 상태 업데이트
            const updatedSubmission = await tx.submission.update({
                where: { id: submissionId },
                data: {
                    status: newStatus as any,
                    reviewedAt,
                    reviewerId,
                },
                include: { video: { select: { id: true } } }
            });

            // 2. Video.status 자동 연동
            if (updatedSubmission.videoId) {
                if (action === "APPROVE") {
                    await tx.video.update({
                        where: { id: updatedSubmission.videoId },
                        data: {
                            status: "APPROVED",
                            adEligible: adEligible === true
                        }
                    });
                } else if (action === "REJECT" || action === "UNDO") {
                    await tx.video.update({
                        where: { id: updatedSubmission.videoId },
                        data: { status: "DRAFT" }
                    });
                }
            }

            // 3. 피드백 코멘트가 있다면 개별 Feedback 레코드로도 저장
            if (feedback) {
                await tx.feedback.create({
                    data: {
                        content: feedback,
                        type: "GENERAL",
                        authorId: user.id,
                        submissionId: submissionId,
                        status: "PENDING"
                    }
                });
            }

            return updatedSubmission;
        });

        return NextResponse.json({ data: result });

    } catch (err) {
        console.error("Review Action Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
