import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { updateGradeSchema } from "@/lib/validations/grade";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 수정할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = updateGradeSchema.safeParse(body);
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

  const existing = await prisma.pricingGrade.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "등급을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.pricingGrade.update({
        where: { id },
        data: parsed.data,
      });

      if (parsed.data.baseRate !== undefined) {
        await tx.user.updateMany({
          where: { gradeId: id },
          data: { baseRate: parsed.data.baseRate },
        });
      }

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "이미 존재하는 등급 이름입니다." } },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 삭제할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.pricingGrade.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "등급을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { gradeId: id },
      data: { gradeId: null },
    });

    await tx.pricingGrade.delete({ where: { id } });
  });

  return NextResponse.json({ data: { deleted: true, affectedStars: existing._count.users } });
}
