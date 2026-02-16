/**
 * AI 분석 백그라운드 트리거.
 * 업로드/범프 후 fire-and-forget으로 호출합니다.
 * Rate Limit(429)은 gemini.ts에서 자동 재시도합니다.
 */

import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/cloudflare/stream";
import { analyzeVideo, isGeminiConfigured } from "@/lib/ai/gemini";

export async function triggerAiAnalysis(submissionId: string): Promise<void> {
    try {
        // 1. Submission 조회
        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
            select: { streamUid: true, starId: true, versionTitle: true },
        });

        if (!submission?.streamUid) {
            console.log(`[AI Auto] streamUid 없음 — 분석 스킵 (${submissionId})`);
            return;
        }

        // 2. 이미 분석 완료된 경우 스킵
        const existing = await prisma.aiAnalysis.findUnique({
            where: { submissionId },
            select: { status: true },
        });

        if (existing?.status === "DONE" || existing?.status === "PROCESSING") {
            console.log(`[AI Auto] 이미 ${existing.status} 상태 — 스킵 (${submissionId})`);
            return;
        }

        // 3. PROCESSING 레코드 생성
        const analysis = await prisma.aiAnalysis.upsert({
            where: { submissionId },
            create: { submissionId, status: "PROCESSING" },
            update: { status: "PROCESSING", errorMessage: null },
        });

        // 4. 다운로드 URL 획득
        const videoUrl = await getDownloadUrl(submission.streamUid);
        if (!videoUrl) {
            await prisma.aiAnalysis.update({
                where: { id: analysis.id },
                data: { status: "ERROR", errorMessage: "영상 다운로드 URL 획득 실패" },
            });
            return;
        }

        // 5. Gemini 분석 (429 시 자동 대기/재시도)
        const result = await analyzeVideo(videoUrl);

        // 6. 결과 저장
        await prisma.aiAnalysis.update({
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

        console.log(`[AI Auto] 분석 완료 (${submissionId})`);
    } catch (err: any) {
        console.error(`[AI Auto] 분석 실패 (${submissionId}):`, err?.message);

        try {
            await prisma.aiAnalysis.upsert({
                where: { submissionId },
                create: { submissionId, status: "ERROR", errorMessage: err?.message },
                update: { status: "ERROR", errorMessage: err?.message },
            });
        } catch {
            // ignore
        }
    }
}
