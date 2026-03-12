import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { bulkApproveSchema } from "@/lib/validations/admin-user";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = bulkApproveSchema.safeParse(body);
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

  const { userIds, approved, rejectionReason } = parsed.data;

  try {
    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        isApproved: approved,
        rejectionReason: approved ? null : rejectionReason || null,
      },
    });

    return NextResponse.json({
      data: { updated: result.count },
    });
  } catch (error) {
    console.error("일괄 승인/반려 처리 실패:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "일괄 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
