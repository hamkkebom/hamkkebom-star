import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getSignedDownloadUrl } from "@/lib/cloudflare/stream";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/submissions/[id]/download
 * 제출물 영상을 서버사이드 프록시로 다운로드합니다.
 * ADMIN만 사용 가능.
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
    // 서명된 다운로드 URL 생성 (videodelivery.net 사용)
    const downloadUrl = await getSignedDownloadUrl(streamUid);
    if (!downloadUrl) {
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "다운로드 URL 생성에 실패했습니다." } },
        { status: 500 }
      );
    }

    // Cloudflare에서 영상을 가져와서 프록시로 전달 (파일명 지정)
    const cfResponse = await fetch(downloadUrl);
    if (!cfResponse.ok) {
      console.error(`[Download] CF 응답 실패: ${cfResponse.status} for uid=${streamUid}`);
      return NextResponse.json(
        { error: { code: "DOWNLOAD_FAILED", message: `다운로드 실패 (${cfResponse.status})` } },
        { status: cfResponse.status }
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
    const contentLength = cfResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(cfResponse.body, {
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