import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth-helpers";
import { createTusSession } from "@/lib/cloudflare/stream";

export const dynamic = "force-dynamic";

const tusCreateSchema = z.object({
  uploadLength: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024 * 1024), // 5GB 상한
  filename: z.string().min(1).max(200),
  maxDurationSeconds: z.number().int().min(1).max(3600).optional().default(3600),
});

/**
 * Cloudflare Stream TUS 업로드 세션을 생성합니다.
 * basic POST(/api/submissions/upload-url)의 200MB 한계를 넘는 대용량 영상용.
 * 클라이언트는 반환된 tusUrl에 PATCH 청크를 직접 보냅니다.
 */
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "업로드 권한이 없습니다." } },
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

  const parsed = tusCreateSchema.safeParse(body);
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
    const result = await createTusSession(
      parsed.data.uploadLength,
      parsed.data.filename,
      parsed.data.maxDurationSeconds
    );
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "TUS_CREATE_FAILED",
          message: error instanceof Error ? error.message : "TUS 세션 생성에 실패했습니다.",
        },
      },
      { status: 502 }
    );
  }
}
