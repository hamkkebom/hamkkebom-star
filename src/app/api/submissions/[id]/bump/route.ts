import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

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
            video: true,
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

    // 2. 요청 데이터 파싱 (새로운 영상의 streamUid)
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

    // 3. 버전 계산 (Semantic Versioning Logic)
    // v1.0 -> v1.1 (기본적으로 Minor bump)
    // TODO: 메이저 업데이트 로직이 필요하면 body.type = 'MAJOR' 등을 받을 수 있음.
    let nextVersion = "1.0";
    const currentVerStr = source.version.replace(/^v/, "");
    const parts = currentVerStr.split(".").map(Number);

    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        // Minor increment
        nextVersion = `${parts[0]}.${parts[1] + 1}`;
    } else if (parts.length === 1 && !isNaN(parts[0])) {
        nextVersion = `${parts[0]}.1`;
    } else {
        // Fallback
        nextVersion = `${currentVerStr}.1`;
    }

    // 4. 새 버전 생성 (Transaction)
    // 비디오 레코드 생성 -> 서브미션 생성 (연결)
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 4-1. 새 비디오 레코드 생성
            const newVideo = await tx.video.create({
                data: {
                    title: videoTitle || source.versionTitle || `v${nextVersion} Update`,
                    streamUid: streamUid,
                    thumbnailUrl: thumbnailUrl || source.thumbnailUrl,
                    ownerId: source.starId, // 필수 필드: 원본 작성자
                    technicalSpec: {
                        create: {
                            duration: duration || 0,
                        }
                    }
                }
            });

            // 4-2. 새 서브미션 생성 (데이터 계승)
            const newSubmission = await tx.submission.create({
                data: {
                    assignmentId: source.assignmentId, // 같은 프로젝트(과제)
                    starId: source.starId,             // 같은 작성자
                    parent: { connect: { id: source.parentId || source.id } }, // 버전 체인: 루트 연결

                    version: nextVersion,
                    versionSlot: (source.versionSlot || 0) + 1, // 슬롯 증가
                    status: "PENDING",                 // 다시 대기 상태로 시작

                    // --- 계승되는 메타데이터 ---
                    versionTitle: source.versionTitle, // 제목 계승
                    summaryFeedback: source.summaryFeedback, // 설명 계승

                    // --- 새로운 영상 연결 ---
                    videoId: newVideo.id,
                    streamUid: streamUid, // Denormalized field for quick access
                    thumbnailUrl: thumbnailUrl || source.thumbnailUrl
                }
            });

            return newSubmission;
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: `새로운 버전(v${nextVersion})이 생성되었습니다.`
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "버전 생성 중 오류가 발생했습니다." } }, { status: 500 });
    }
}
