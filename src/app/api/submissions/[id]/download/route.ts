import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedDownloadUrl, getSignedDownloadUrlCustomerDomain, getDownloadUrl } from "@/lib/cloudflare/stream";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * 여러 URL을 순서대로 시도하여, 실제 비디오 파일을 반환하는 첫 번째 URL을 사용합니다.
 * CF Stream 다운로드 URL은 302 리다이렉트를 반환할 수 있으므로 자동 follow.
 */
async function tryFetchVideo(urls: (string | null)[]): Promise<Response | null> {
  for (const url of urls) {
    if (!url) continue;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) {
        console.log(`[Download] URL failed (${res.status}): ${url.slice(0, 80)}...`);
        continue;
      }
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("video/") && !ct.includes("octet-stream")) {
        const body = await res.text();
        console.log(`[Download] URL returned non-video ct=${ct}: ${body.slice(0, 200)}`);
        continue;
      }
      return res;
    } catch (err) {
      console.error(`[Download] Fetch error for ${url.slice(0, 80)}:`, err);
      continue;
    }
  }
  return null;
}

/**
 * GET /api/submissions/[id]/download
 * 제출물 영상을 서버사이드 프록시로 다운로드합니다.
 * ADMIN만 사용 가능. 다운로드 미활성화 영상은 자동 활성화 후 폴링합니다.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      streamUid: true,
      versionTitle: true,
      version: true,
      video: { select: { streamUid: true, title: true } },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const streamUid = submission.streamUid || submission.video?.streamUid;
  if (!streamUid) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "영상 정보를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  try {
    // 다운로드 활성화 (비활성화 상태면 자동 활성화 + 폴링)
    const enabledUrl = await getDownloadUrl(streamUid);

    // 서명된 다운로드 URL 생성 (두 가지 도메인)
    const signedUrl = await getSignedDownloadUrl(streamUid);
    const customerUrl = await getSignedDownloadUrlCustomerDomain(streamUid);

    // 순서: 1) CF API 직접 URL → 2) videodelivery.net signed → 3) customer domain signed
    const videoResponse = await tryFetchVideo([enabledUrl, signedUrl, customerUrl]);

    if (!videoResponse) {
      return NextResponse.json(
        { error: { code: "DOWNLOAD_FAILED", message: "영상 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요." } },
        { status: 503 }
      );
    }

    // 파일명에서 특수문자 제거하고 안전한 이름으로 변환
    const title = submission.versionTitle || submission.video?.title || `영상_v${submission.version}`;
    const safeTitle = title
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
    const contentLength = videoResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(videoResponse.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("Failed to download submission video:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "내부 서버 오류" } },
      { status: 500 }
    );
  }
}