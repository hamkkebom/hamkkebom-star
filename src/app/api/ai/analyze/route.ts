import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getDownloadUrl } from "@/lib/cloudflare/stream";
import { analyzeVideo, isGeminiConfigured } from "@/lib/ai/gemini";

export async function POST(request: Request) {
    console.log("[AI Analyze] === POST /api/ai/analyze START ===");

    const user = await getAuthUser();
    console.log("[AI Analyze] Step 1: user =", user?.id, user?.role);

    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    let body: { submissionId?: string; force?: boolean };
    try {
        body = await request.json();
        console.log("[AI Analyze] Step 2: body =", JSON.stringify(body));
    } catch {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } },
            { status: 400 }
        );
    }

    const { submissionId, force } = body;
    if (!submissionId) {
        return NextResponse.json(
            { error: { code: "BAD_REQUEST", message: "submissionId가 필요합니다." } },
            { status: 400 }
        );
    }

    try {
        // 1. Submission 조회
        console.log("[AI Analyze] Step 3: finding submission", submissionId);
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: {
                id: true,
                starId: true,
                streamUid: true,
                versionTitle: true,
                video: { select: { streamUid: true } },
                aiAnalysis: { select: { id: true, status: true } },
            },
        });
        const effectiveStreamUid = submission?.streamUid || submission?.video?.streamUid;
        console.log("[AI Analyze] Step 3 result: submission =", submission?.id, "streamUid =", submission?.streamUid, "video.streamUid =", submission?.video?.streamUid, "effective =", effectiveStreamUid, "aiStatus =", submission?.aiAnalysis?.status);

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

        // 2. 이미 완료된 분석 존재 시: force가 아니면 기존 결과 반환
        if (submission.aiAnalysis?.status === "DONE" && !force) {
            const existing = await prisma.aiAnalysis.findUnique({
                where: { submissionId },
            });
            return NextResponse.json({ success: true, data: existing });
        }

        // 이미 진행 중이면 거부 (force여도 진행 중에는 중복 방지)
        if (submission.aiAnalysis?.status === "PROCESSING") {
            return NextResponse.json(
                { error: { code: "CONFLICT", message: "이미 분석이 진행 중입니다." } },
                { status: 409 }
            );
        }

        // 3. PROCESSING 상태로 레코드 생성/갱신
        console.log("[AI Analyze] Step 4: upsert PROCESSING");
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
        console.log("[AI Analyze] Step 4 result: analysis.id =", analysis.id);

        // 4. 영상 다운로드 URL 획득
        console.log("[AI Analyze] Step 5: getDownloadUrl for", effectiveStreamUid);
        let videoUrl: string | null = null;
        if (effectiveStreamUid) {
            videoUrl = await getDownloadUrl(effectiveStreamUid);
        }
        console.log("[AI Analyze] Step 5 result: videoUrl =", videoUrl);

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
        console.log("[AI Analyze] Step 6: analyzeVideo START");
        const result = await analyzeVideo(videoUrl);
        console.log("[AI Analyze] Step 6 result: summary =", result.summary?.substring(0, 50));

        // 6. 결과 저장
        console.log("[AI Analyze] Step 7: saving results");
        const updated = await prisma.aiAnalysis.update({
            where: { id: analysis.id },
            data: {
                status: "DONE",
                summary: result.summary,
                scores: result.scores as any,
                todoItems: result.todoItems as any,
                insights: result.insights as any,
                model: isGeminiConfigured() ? "gemini-2.0-flash-lite" : "mock",
            },
        });

        console.log("[AI Analyze] === DONE ===");
        return NextResponse.json({ success: true, data: updated });

    } catch (e: any) {
        console.error("[AI Analyze] ERROR:", e?.message);
        console.error("[AI Analyze] STACK:", e?.stack);

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
