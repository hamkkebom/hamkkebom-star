import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { reorderGradesSchema } from "@/lib/validations/grade";

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

  const parsed = reorderGradesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
        },
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      parsed.data.map((item) =>
        prisma.pricingGrade.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return NextResponse.json({ data: { reordered: parsed.data.length } });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "등급 순서 변경 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
