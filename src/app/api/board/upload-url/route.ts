import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/cloudflare/r2";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 },
    );
  }

  let body: { filename?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "요청 본문이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const { filename, contentType } = body;

  if (!filename || !contentType) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "파일명과 콘텐츠 타입을 입력해주세요.",
        },
      },
      { status: 400 },
    );
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            "지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP, GIF)",
        },
      },
      { status: 400 },
    );
  }

  const key = `board/${user.id}/${Date.now()}-${filename}`;
  const uploadUrl = await getPresignedUploadUrl(key, contentType);

  if (!uploadUrl) {
    // Mock mode — R2 미설정 시 placeholder URL 반환
    return NextResponse.json({
      data: { uploadUrl: null, publicUrl: getPublicUrl(key), key, mock: true },
    });
  }

  return NextResponse.json({
    data: { uploadUrl, publicUrl: getPublicUrl(key), key },
  });
}
