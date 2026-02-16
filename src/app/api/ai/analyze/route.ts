import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getDownloadUrl } from "@/lib/cloudflare/stream";
import { analyzeVideo, isGeminiConfigured } from "@/lib/ai/gemini";

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    let body: { submissionId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } },
            { status: 400 }
        );
    }

    const { submissionId } = body;
    if (!submissionId) {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "submissionId가 필요합니다." } },
            { status: 400 }
        );
    }

    try {
        // 1. Submission 조회
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: {
                id: true,
                starId: true,
                streamUid: true,
                versionTitle: true,
                aiAnalysis: { select: { id: true, status: true } },
            },
        });

        if (!submission) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
                { status: 404 }
            );
        }

        // 권한 확인
        if (user.role === "STAR" && submission.starId !== user.id) {
            return NextResponse.json(
                { error: { code: "FORBIDDEN", message: "본인의 제출물만 분석할 수 있습니다." } },
                { status: 403 }
            );
        }

        // 2. 이미 완료된 분석 존재 시 반환
        if (submission.aiAnalysis?.status === "DONE") {
            const existing = await prisma.aiAnalysis.findUnique({
                where: { submissionId },
            });
            return NextResponse.json({ success: true, data: existing });
        }

        // 이미 진행 중이면 거부
        if (submission.aiAnalysis?.status === "PROCESSING") {
            return NextResponse.json(
                { error: { code: "CONFLICT", message: "이미 분석이 진행 중입니다." } },
                { status: 409 }
            );
        }

        // 3. PROCESSING 상태로 레코드 생성/갱신
        const analysis = await prisma.aiAnalysis.upsert({
            where: { submissionId },
            create: {
                submissionId,
                status: "PROCESSING",
            },
            update: {
                status: "PROCESSING",
                errorMessage: null,
            },
        });

        // 4. 영상 다운로드 URL 획득
        let videoUrl: string | null = null;
        if (submission.streamUid) {
            videoUrl = await getDownloadUrl(submission.streamUid);
        }

        if (!videoUrl) {
            await prisma.aiAnalysis.update({
                where: { id: analysis.id },
                data: { status: "ERROR", errorMessage: "영상 다운로드 URL을 가져올 수 없습니다." },
            });
            return NextResponse.json(
                { error: { code: "INTERNAL_ERROR", message: "영상 다운로드 URL을 가져올 수 없습니다." } },
                { status: 500 }
            );
        }

        // 5. Gemini AI 분석 실행
        const result = await analyzeVideo(videoUrl);

        // 6. 결과 저장
        const updated = await prisma.aiAnalysis.update({
            where: { id: analysis.id },
            data: {
                status: "DONE",
                summary: result.summary,
                scores: result.scores as any,
                todoItems: result.todoItems as any,
                insights: result.insights as any,
                model: isGeminiConfigured() ? "gemini-2.0-flash" : "mock",
            },
        });

        return NextResponse.json({ success: true, data: updated });

    } catch (e: any) {
        console.error("[AI Analyze] ERROR:", e?.message);

        // 에러 시 상태 업데이트
        try {
            await prisma.aiAnalysis.update({
                where: { submissionId },
                data: { status: "ERROR", errorMessage: e?.message || "알 수 없는 오류" },
            });
        } catch {
            // upsert로 이미 없을 수 있음
        }

        return NextResponse.json({
            error: {
                code: "INTERNAL_ERROR",
                message: e?.message || "AI 분석 중 오류가 발생했습니다.",
            }
        }, { status: 500 });
    }
}
