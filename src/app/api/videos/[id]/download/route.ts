import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedDownloadUrl, getSignedDownloadUrlCustomerDomain, getDownloadUrl } from "@/lib/cloudflare/stream";

export const dynamic = "force-dynamic";

/**
 * 여러 URL을 순서대로 시도하여, 실제 비디오 파일을 반환하는 첫 번째 URL을 사용합니다.
 * JSON/HTML 에러 응답을 받으면 다음 URL로 넘어갑니다.
 * CF Stream 다운로드 URL은 302 리다이렉트를 반환할 수 있으므로 자동 follow.
 */
async function tryFetchVideo(urls: (string | null)[]): Promise<Response | null> {
    for (const url of urls) {
        if (!url) continue;
        try {
            // redirect: "follow"로 302 리다이렉트 자동 추적
            const res = await fetch(url, { redirect: "follow" });
            if (!res.ok) {
                console.log(`[Download] URL failed (${res.status}): ${url.slice(0, 80)}...`);
                continue;
            }
            const ct = res.headers.get("content-type") || "";
            // 실제 비디오 파일인지 확인 (json, html, text/plain 등 에러 응답 걸러내기)
            if (!ct.includes("video/") && !ct.includes("octet-stream")) {
                const body = await res.text();
                console.log(`[Download] URL returned non-video ct=${ct}: ${body.slice(0, 200)}`);
                continue;
            }
            // 실제 비디오 파일!
            return res;
        } catch (err) {
            console.error(`[Download] Fetch error for ${url.slice(0, 80)}:`, err);
            continue;
        }
    }
    return null;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();

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

        const uid = video.streamUid;

        // 다운로드 활성화 (비활성화 상태면 자동 활성화) — 이 URL이 옛날 영상에서 유일하게 작동
        const enabledUrl = await getDownloadUrl(uid);

        // 서명된 다운로드 URL 생성 (두 가지 도메인) — 최근 영상에서 작동
        const signedUrl = await getSignedDownloadUrl(uid);
        const customerUrl = await getSignedDownloadUrlCustomerDomain(uid);

        // 순서: 1) CF API 직접 URL (옛날 영상) → 2) videodelivery.net signed → 3) customer domain signed
        const videoResponse = await tryFetchVideo([enabledUrl, signedUrl, customerUrl]);

        if (!videoResponse) {
            return NextResponse.json(
                { error: "영상 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요." },
                { status: 503 }
            );
        }

        // 파일명 생성
        const safeTitle = (video.title || "video")
            .replace(/[\\/:*?"<>|]/g, "_")
            .trim();
        const filename = `${safeTitle}.mp4`;

        const headers = new Headers();
        headers.set("Content-Type", "video/mp4");
        headers.set(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );

        const contentLength = videoResponse.headers.get("content-length");
        if (contentLength) {
            headers.set("Content-Length", contentLength);
        }

        return new Response(videoResponse.body, { status: 200, headers });

    } catch (error) {
        console.error("Failed to download video:", error);
        return NextResponse.json(
            { error: "내부 서버 오류" },
            { status: 500 }
        );
    }
}
