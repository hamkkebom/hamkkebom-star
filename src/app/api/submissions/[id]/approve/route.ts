import { NextResponse } from "next/server";
import { SubmissionStatus, AssignmentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "관리자만 승인할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.findUnique({
        where: { id },
        select: { id: true, status: true, assignmentId: true },
      });

      if (!submission) {
        throw { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다.", status: 404 };
      }

      const result = await tx.submission.update({
        where: { id },
        data: {
          status: SubmissionStatus.APPROVED,
          reviewerId: user.id,
          approvedAt: new Date(),
        },
        include: {
          star: { select: { id: true, name: true, email: true } },
        },
      });

      // 배정이 있으면 COMPLETED로 변경
      if (submission.assignmentId) {
        await tx.projectAssignment.update({
          where: { id: submission.assignmentId },
          data: { status: AssignmentStatus.COMPLETED },
        });
      }

      return result;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && "status" in error) {
      const e = error as { code: string; message: string; status: number };
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "승인 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    );
  }
}
