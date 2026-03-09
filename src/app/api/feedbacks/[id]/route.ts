import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import { createFeedbackSchema } from "@/lib/validations/feedback";
export const dynamic = "force-dynamic";

// Get single Feedback by ID
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    const feedback = await prisma.feedback.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
            submission: { select: { id: true, starId: true, versionTitle: true } },
        },
    });

    if (!feedback) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    if (user.role === "STAR" && feedback.submission.starId !== user.id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "본인 제출물의 피드백만 조회할 수 있습니다." } },
            { status: 403 }
        );
    }

    return NextResponse.json({ data: feedback });
}

// Edit Feedback (ADMIN: all fields, STAR: resolvedByStar only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    try {
        const existing = await prisma.feedback.findUnique({
            where: { id },
            select: { authorId: true, submission: { select: { starId: true } } },
        });

        if (!existing) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
                { status: 404 }
            );
        }

        const body = await request.json();

        // STAR는 본인 제출물의 피드백에 대해 resolvedByStar만 변경 가능
        if (user.role === "STAR") {
            if (existing.submission.starId !== user.id) {
                return NextResponse.json(
                    { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
                    { status: 403 }
                );
            }

            const starSchema = z.object({
                resolvedByStar: z.boolean(),
            });

            const parsed = starSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: { code: "BAD_REQUEST", message: "resolvedByStar 값만 변경할 수 있습니다." } },
                    { status: 400 }
                );
            }

            const updated = await prisma.feedback.update({
                where: { id },
                data: { resolvedByStar: parsed.data.resolvedByStar },
                include: {
                    author: { select: { id: true, name: true, email: true, avatarUrl: true } },
                },
            });

            return NextResponse.json({ data: updated });
        }

        // ADMIN: 기존 전체 필드 수정
        if (existing.authorId !== user.id && user.role !== "ADMIN") {
            return NextResponse.json(
                { error: { code: "FORBIDDEN", message: "본인의 피드백만 수정할 수 있습니다." } },
                { status: 403 }
            );
        }

        // Partial update schema based on createFeedbackSchema
        const updateSchema = z.object({
            content: z.string().min(1, "내용을 입력해주세요.").optional(),
            type: z.enum(["GENERAL", "SUBTITLE", "BGM", "CUT_EDIT", "COLOR_GRADE"]).optional(),
            priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
            status: z.enum(["PENDING", "RESOLVED", "WONTFIX"]).optional(),
            startTime: z.number().nullable().optional(),
            endTime: z.number().nullable().optional(),
        });

        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: {
                        code: "BAD_REQUEST",
                        message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
                    },
                },
                { status: 400 }
            );
        }

        const updated = await prisma.feedback.update({
            where: { id },
            data: parsed.data,
            include: {
                author: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Failed to update feedback:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "피드백 수정 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}

// Delete Feedback
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    try {
        // 본인 피드백인지 확인
        const existing = await prisma.feedback.findUnique({
            where: { id },
            select: { authorId: true, submissionId: true },
        });

        if (!existing) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
                { status: 404 }
            );
        }

        if (existing.authorId !== user.id && user.role !== "ADMIN") {
            return NextResponse.json(
                { error: { code: "FORBIDDEN", message: "본인의 피드백만 삭제할 수 있습니다." } },
                { status: 403 }
            );
        }

        // 트랜잭션으로 삭제 + 남은 피드백 0개 시 PENDING 전환
        const result = await prisma.$transaction(async (tx) => {
            await tx.feedback.delete({ where: { id } });

            // 남은 피드백 수 확인
            const remainingCount = await tx.feedback.count({
                where: { submissionId: existing.submissionId },
            });

            // 피드백이 0개이면 submission 상태를 PENDING으로 되돌림
            if (remainingCount === 0) {
                await tx.submission.update({
                    where: { id: existing.submissionId },
                    data: { status: "PENDING" },
                });
            }

            return { remainingCount };
        });

        void createAuditLog({ actorId: user.id, action: "DELETE_FEEDBACK", entityType: "Feedback", entityId: id });

        return NextResponse.json({ success: true, remainingFeedbacks: result.remainingCount });
    } catch (error) {
        console.error("Failed to delete feedback:", error);
        return NextResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "피드백 삭제 중 오류가 발생했습니다." } },
            { status: 500 }
        );
    }
}

