import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { videoUploadUrlSchema } from "@/lib/validations/video";
import { createTusUploadUrl } from "@/lib/cloudflare/stream";

export async function POST(request: Request) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN" && user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = videoUploadUrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    const result = await createTusUploadUrl(parsed.data.maxDurationSeconds);

    return NextResponse.json(
      { data: result },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_URL_FAILED",
          message: error instanceof Error ? error.message : "업로드 URL 생성에 실패했습니다.",
        },
      },
      { status: 502 }
    );
  }
}
