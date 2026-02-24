import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { getDownloadUrl, getSignedPlaybackToken } from "@/lib/cloudflare/stream";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/submissions/[id]/download
 * 제출물 영상의 mp4 다운로드 URL을 서명된 토큰과 함께 반환합니다.
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

  // 1) 다운로드 URL 획득 (다운로드 기능 활성화)
  const downloadUrl = await getDownloadUrl(streamUid);
  if (!downloadUrl) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "다운로드 URL 생성에 실패했습니다." } },
      { status: 500 }
    );
  }

  // 2) 서명된 토큰 발급 (requireSignedURLs 설정 때문에 필요)
  // 다운로드를 위해서는 downloadable: true 옵션이 포함된 토큰이어야 함
  const signedToken = await getSignedPlaybackToken(streamUid, true);

  // 3) 서명된 토큰이 있으면 다운로드 URL의 UID 부분을 토큰으로 교체
  let finalUrl = downloadUrl;
  if (signedToken) {
    // downloadUrl 형태: https://customer-xxx.cloudflarestream.com/{uid}/downloads/default.mp4
    // 서명된 URL: https://customer-xxx.cloudflarestream.com/{token}/downloads/default.mp4
    finalUrl = downloadUrl.replace(streamUid, signedToken);
  }

  const filename = submission.versionTitle || submission.video?.title || `영상_v${submission.version}`;

  return NextResponse.json({
    data: { downloadUrl: finalUrl, filename },
  });
}