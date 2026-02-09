import { NextResponse } from "next/server";
import { FeedbackStatus, SubmissionStatus, SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role === "STAR") {
    // Count pending feedbacks for this STAR
    const unreadFeedbacks = await prisma.feedback.count({
      where: {
        submission: {
          starId: user.id,
        },
        status: FeedbackStatus.PENDING,
      },
    });

    return NextResponse.json({
      data: {
        unreadFeedbacks,
      },
    });
  }

  if (user.role === "ADMIN") {
    // Count pending submissions and settlements
    const [unreviewedSubmissions, pendingSettlements] = await Promise.all([
      prisma.submission.count({
        where: {
          status: SubmissionStatus.PENDING,
        },
      }),
      prisma.settlement.count({
        where: {
          status: SettlementStatus.PENDING,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        unreviewedSubmissions,
        pendingSettlements,
      },
    });
  }

  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
    { status: 403 }
  );
}
