import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMagicLinkSchema } from "@/lib/validations/admin-user";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let body: unknown;
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
      { status: 400 }
    );
  }

  const parsed = sendMagicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // 대상 사용자 조회
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 앱 origin 추출 (request URL에서)
  const origin = new URL(request.url).origin;

  // Supabase에서 매직링크 생성 및 이메일 발송
  const supabaseAdmin = createAdminClient();
  const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (otpError) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: `매직링크 전송 실패: ${otpError.message}`,
        },
      },
      { status: 500 }
    );
  }

  void createAuditLog({
    actorId: user.id,
    action: "SEND_MAGIC_LINK",
    entityType: "User",
    entityId: id,
    changes: { magicLinkSentTo: { from: null, to: email } },
  });

  return NextResponse.json({
    data: { message: `${email}로 매직링크를 전송했습니다.` },
  });
}
