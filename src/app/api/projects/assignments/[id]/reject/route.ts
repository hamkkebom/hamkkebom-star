import { NextResponse } from "next/server";
import { z } from "zod";
import { AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .max(500, "거절 사유는 500자 이내여야 합니다.")
    .optional(),
});

export async function POST(request: Request, { params }: Params) {
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
      { error: { code: "BAD_REQUEST", message: "요청 본문이 올바르지 않습니다." } },
      { status: 400 }
    );
  }

  const parsed = rejectSchema.safeParse(body);
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
    const assignment = await prisma.projectAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "배정을 찾을 수 없습니다." } },
        { status: 404 }
      );
    }

    if (assignment.status !== AssignmentStatus.PENDING_APPROVAL) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "승인 대기 상태가 아닙니다." } },
        { status: 409 }
      );
    }

    const updated = await prisma.projectAssignment.update({
      where: { id },
      data: {
        status: AssignmentStatus.REJECTED,
        rejectionReason: parsed.data.rejectionReason || null,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
      include: {
        star: { select: { id: true, name: true, email: true } },
        request: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "거절 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
