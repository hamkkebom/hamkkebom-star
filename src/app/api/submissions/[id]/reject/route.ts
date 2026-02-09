import { NextResponse } from "next/server";
import { SubmissionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

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
      { error: { code: "FORBIDDEN", message: "관리자만 반려할 수 있습니다." } },
      { status: 403 }
    );
  }

  const { id } = await params;

  let reason = "";
  try {
    const body = await request.json();
    reason = body.reason ?? "";
  } catch {
    // reason은 선택사항
  }

  try {
    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: SubmissionStatus.REJECTED,
        reviewerId: user.id,
        reviewedAt: new Date(),
        summaryFeedback: reason || null,
      },
      include: {
        star: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "제출물을 찾을 수 없습니다." } },
      { status: 404 }
    );
  }
}
