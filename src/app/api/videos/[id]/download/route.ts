import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedDownloadUrl } from "@/lib/cloudflare/stream";

export const dynamic = "force-dynamic";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();

        // 관리자(ADMIN) 권한 확인
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "관리자 권한이 필요합니다." },
                { status: 403 }
            );
        }

        const { id } = await params;

        const video = await prisma.video.findUnique({
            where: { id },
            select: { streamUid: true, title: true },
        });

        if (!video || !video.streamUid) {
            return NextResponse.json(
                { error: "영상을 찾을 수 없거나 다운로드할 수 없는 상태입니다." },
                { status: 404 }
            );
        }

        // 서명된 다운로드 URL 생성
        const downloadUrl = await getSignedDownloadUrl(video.streamUid);

        if (!downloadUrl) {
            return NextResponse.json(
                { error: "다운로드 토큰 발급 실패. Cloudflare Stream 설정을 확인해주세요." },
                { status: 500 }
            );
        }

        // Cloudflare에서 영상을 가져와서 프록시로 전달 (파일명 지정)
        const cfResponse = await fetch(downloadUrl);
        if (!cfResponse.ok) {
            return NextResponse.json(
                { error: `다운로드 실패 (${cfResponse.status})` },
                { status: cfResponse.status }
            );
        }

        // 파일명에서 특수문자 제거하고 안전한 이름으로 변환
        const safeTitle = (video.title || "video")
            .replace(/[\\/:*?"<>|]/g, "_")
            .trim();
        const filename = `${safeTitle}.mp4`;

        // Content-Disposition 헤더로 파일명 지정
        const headers = new Headers();
        headers.set("Content-Type", "video/mp4");
        headers.set(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );

        // Content-Length가 있으면 전달
        const contentLength = cfResponse.headers.get("content-length");
        if (contentLength) {
            headers.set("Content-Length", contentLength);
        }

        return new Response(cfResponse.body, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error("Failed to download video:", error);
        return NextResponse.json(
            { error: "내부 서버 오류" },
            { status: 500 }
        );
    }
}
