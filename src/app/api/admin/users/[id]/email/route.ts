import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateEmailSchema } from "@/lib/validations/admin-user";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

export async function PATCH(
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

  const parsed = updateEmailSchema.safeParse(body);
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

  const { email: newEmail } = parsed.data;

  // 대상 사용자 조회
  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  // 같은 이메일이면 변경 불필요
  if (targetUser.email === newEmail) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "현재 이메일과 동일합니다.",
        },
      },
      { status: 400 }
    );
  }

  // 이메일 중복 체크 (Prisma)
  const existingUser = await prisma.user.findUnique({
    where: { email: newEmail },
  });
  if (existingUser) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "이미 사용 중인 이메일입니다.",
        },
      },
      { status: 409 }
    );
  }

  // Supabase Auth 이메일 업데이트 (service_role)
  const supabaseAdmin = createAdminClient();
  const { error: supabaseError } =
    await supabaseAdmin.auth.admin.updateUserById(targetUser.authId, {
      email: newEmail,
      email_confirm: true,
    });

  if (supabaseError) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: `Supabase 이메일 변경 실패: ${supabaseError.message}`,
        },
      },
      { status: 500 }
    );
  }

  // Prisma DB 이메일 업데이트
  const oldEmail = targetUser.email;
  const updated = await prisma.user.update({
    where: { id },
    data: { email: newEmail },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  void createAuditLog({
    actorId: user.id,
    action: "UPDATE_USER_EMAIL",
    entityType: "User",
    entityId: id,
    changes: { email: { from: oldEmail, to: newEmail } },
  });

  return NextResponse.json({ data: updated });
}
