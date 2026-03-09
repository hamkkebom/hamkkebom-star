import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

/**
 * GET /api/feedbacks/export?submissionId=xxx
 *
 * 특정 제출물의 피드백을 텍스트 형식으로 내보내기 (복사/다운로드용)
 */
export async function GET(request: Request) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
        return NextResponse.json(
            { error: "submissionId is required" },
            { status: 400 }
        );
    }

    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: {
            id: true,
            version: true,
            versionTitle: true,
            createdAt: true,
            star: { select: { name: true, chineseName: true } },
            assignment: {
                select: { request: { select: { title: true } } },
            },
            video: { select: { title: true } },
        },
    });

    if (!submission) {
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const feedbacks = await prisma.feedback.findMany({
        where: { submissionId },
        include: {
            author: { select: { name: true, role: true } },
            replies: {
                select: {
                    content: true,
                    createdAt: true,
                    author: { select: { name: true, role: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    // Format as readable text
    const projectTitle =
        submission.versionTitle ||
        submission.assignment?.request?.title ||
        submission.video?.title ||
        "제목 없음";

    const starName = submission.star.chineseName || submission.star.name;
    const date = new Date(submission.createdAt).toLocaleDateString("ko-KR");

    const lines: string[] = [
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📋 피드백 리포트`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `프로젝트: ${projectTitle}`,
        `버전: v${submission.version.replace(/^v/i, "")}`,
        `STAR: ${starName}`,
        `제출일: ${date}`,
        `피드백 수: ${feedbacks.length}건`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
    ];

    feedbacks.forEach((fb, idx) => {
        const time = fb.startTime !== null ? formatTimecode(fb.startTime) : "";
        const status = fb.status === "RESOLVED" ? "✅ 해결" : "⏳ 미해결";
        const priority = fb.priority === "URGENT" ? "🔴 높음" : fb.priority === "NORMAL" ? "🟡 보통" : "🟢 낮음";

        lines.push(`[${idx + 1}] ${fb.author.name} (${fb.author.role === "ADMIN" ? "관리자" : fb.author.role})`);
        if (time) lines.push(`⏱ ${time}`);
        lines.push(`상태: ${status} | 우선순위: ${priority}`);
        lines.push(`💬 ${fb.content}`);

        if (fb.replies.length > 0) {
            fb.replies.forEach((r) => {
                lines.push(`   ↳ ${r.author.name}: ${r.content}`);
            });
        }

        lines.push(``);
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`내보내기 시각: ${new Date().toLocaleString("ko-KR")}`);

    const text = lines.join("\n");

    return new NextResponse(text, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="feedback-report-${submissionId.slice(0, 8)}.txt"`,
        },
    });
}

function formatTimecode(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
