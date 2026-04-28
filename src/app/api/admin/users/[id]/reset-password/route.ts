import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuditLog } from "@/lib/audit";
export const dynamic = "force-dynamic";

const TEMP_PASSWORD = "123456789";

export async function POST(
  _request: Request,
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

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, authId: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.authId,
    { password: TEMP_PASSWORD }
  );

  if (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: `비밀번호 초기화 실패: ${error.message}` } },
      { status: 500 }
    );
  }

  void createAuditLog({
    actorId: user.id,
    action: "RESET_PASSWORD",
    entityType: "User",
    entityId: id,
    changes: { password: { from: null, to: "TEMP_RESET" } },
  });

  return NextResponse.json({
    data: { message: `${targetUser.name}의 비밀번호가 임시 비밀번호(${TEMP_PASSWORD})로 초기화되었습니다.` },
  });
}
