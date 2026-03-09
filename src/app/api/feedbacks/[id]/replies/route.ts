import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createReplySchema } from "@/lib/validations/feedback-reply";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET — 특정 피드백의 답변 목록 조회
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

    const { id: feedbackId } = await params;

    // 피드백 존재 및 접근 권한 확인
    const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId },
        select: { id: true, submission: { select: { starId: true } } },
    });

    if (!feedback) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    // STAR는 본인 제출물의 피드백만 조회 가능
    if (user.role === "STAR" && feedback.submission.starId !== user.id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
            { status: 403 }
        );
    }

    const replies = await prisma.feedbackReply.findMany({
        where: { feedbackId },
        include: {
            author: {
                select: { id: true, name: true, role: true, avatarUrl: true },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: replies });
}

// POST — 피드백에 답변 작성 (ADMIN + STAR 모두 가능)
export async function POST(
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

    const { id: feedbackId } = await params;

    // 바디 파싱
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
            { status: 400 }
        );
    }

    const parsed = createReplySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다." } },
            { status: 400 }
        );
    }

    // 피드백 존재 및 접근 권한 확인
    const feedback = await prisma.feedback.findUnique({
        where: { id: feedbackId },
        select: { id: true, submission: { select: { starId: true } } },
    });

    if (!feedback) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "피드백을 찾을 수 없습니다." } },
            { status: 404 }
        );
    }

    // STAR는 본인 제출물의 피드백에만 답변 가능
    if (user.role === "STAR" && feedback.submission.starId !== user.id) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
            { status: 403 }
        );
    }

    const reply = await prisma.feedbackReply.create({
        data: {
            feedbackId,
            authorId: user.id,
            content: parsed.data.content.trim(),
        },
        include: {
            author: {
                select: { id: true, name: true, role: true, avatarUrl: true },
            },
        },
    });

    void createAuditLog({
        actorId: user.id,
        action: "CREATE_FEEDBACK_REPLY",
        entityType: "FeedbackReply",
        entityId: reply.id,
        metadata: { feedbackId },
    });

    return NextResponse.json({ data: reply }, { status: 201 });
}
