import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { triggerAiAnalysis } from "@/lib/ai/trigger";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
            { status: 401 }
        );
    }

    const { id } = await params;

    try {
        // 1. 원본 Submission 조회
        const source = await prisma.submission.findUnique({
            where: { id },
            select: {
                id: true,
                parentId: true,
                assignmentId: true,
                starId: true,
                version: true,
                versionSlot: true,
                versionTitle: true,
                summaryFeedback: true,
                thumbnailUrl: true,
                streamUid: true,
            }
        });

        if (!source) {
            return NextResponse.json(
                { error: { code: "NOT_FOUND", message: "원본 버전을 찾을 수 없습니다." } },
                { status: 404 }
            );
        }

        if (user.role === "STAR" && source.starId !== user.id) {
            return NextResponse.json(
                { error: { code: "FORBIDDEN", message: "본인의 프로젝트만 버전을 올릴 수 있습니다." } },
                { status: 403 }
            );
        }

        // 2. 요청 데이터 파싱
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: { code: "BAD_REQUEST", message: "잘못된 요청입니다." } }, { status: 400 });
        }

        const { streamUid, videoTitle, duration, thumbnailUrl } = body;

        if (!streamUid) {
            return NextResponse.json({ error: { code: "BAD_REQUEST", message: "새로운 영상(Stream UID)이 필요합니다." } }, { status: 400 });
        }

        // 3. 버전 계산 — 같은 체인 내 최대 버전에서 +1
        const rootId = source.parentId || source.id;

        const chainVersions = await prisma.submission.findMany({
            where: {
                OR: [
                    { id: rootId },
                    { parentId: rootId },
                ],
            },
            select: { version: true, versionSlot: true },
        });

        let maxMinor = 0;
        let maxSlot = 0;
        for (const row of chainVersions) {
            const matched = /^(\d+)\.(\d+)$/.exec(row.version.replace(/^v/, ""));
            if (matched) {
                maxMinor = Math.max(maxMinor, Number(matched[2]));
            }
            maxSlot = Math.max(maxSlot, row.versionSlot);
        }
        const nextVersion = `1.${maxMinor + 1}`;

        // 4-1. 새 비디오 레코드 생성
        const newVideo = await prisma.video.create({
            data: {
                title: videoTitle || source.versionTitle || `v${nextVersion} Update`,
                streamUid: streamUid,
                thumbnailUrl: thumbnailUrl || source.thumbnailUrl,
                ownerId: source.starId,
                technicalSpec: {
                    create: {
                        duration: duration || 0,
                    }
                }
            }
        });

        // 4-2. 새 서브미션 생성 (데이터 계승)
        const newSubmission = await prisma.submission.create({
            data: {
                assignmentId: source.assignmentId,
                starId: source.starId,
                parentId: rootId,

                version: nextVersion,
                versionSlot: maxSlot + 1,
                status: "PENDING",

                versionTitle: source.versionTitle,
                summaryFeedback: source.summaryFeedback,

                videoId: newVideo.id,
                streamUid: streamUid,
                thumbnailUrl: thumbnailUrl || source.thumbnailUrl
            }
        });

        // 범프 완료 후 AI 분석 자동 트리거 (fire-and-forget)
        triggerAiAnalysis(newSubmission.id).catch(() => { });

        return NextResponse.json({
            success: true,
            data: newSubmission,
            message: `새로운 버전(v${nextVersion})이 생성되었습니다.`
        });

    } catch (e: any) {
        console.error("[bump] ERROR:", e?.message, e?.code, e?.meta);
        return NextResponse.json({
            error: {
                code: "INTERNAL_ERROR",
                message: e?.message || "버전 생성 중 오류가 발생했습니다.",
                prismaCode: e?.code,
                meta: e?.meta
            }
        }, { status: 500 });
    }
}
