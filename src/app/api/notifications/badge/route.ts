import { NextResponse } from "next/server";
import { SubmissionStatus, SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role === "STAR") {
    // Count unseen feedbacks for this STAR
    const unreadFeedbacks = await prisma.feedback.count({
      where: {
        submission: {
          starId: user.id,
        },
        seenByStarAt: null,
      },
    });

    // Count recent board comments on my posts
    const unreadComments = await prisma.boardComment.count({
      where: {
        post: { authorId: user.id },
        authorId: { not: user.id },
      },
    });

    // Count recent board post likes
    const unreadLikes = await prisma.boardPostLike.count({
      where: {
        post: { authorId: user.id },
        user: { id: { not: user.id } },
      },
    });

    return NextResponse.json({
      data: {
        unreadFeedbacks,
        unreadComments,
        unreadLikes,
        total: unreadFeedbacks + unreadComments + unreadLikes,
      },
    });
  }

  if (user.role === "ADMIN") {
    // Count pending submissions and settlements
    const [unreviewedSubmissions, pendingSettlements, pendingApprovals] = await Promise.all([
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
      prisma.projectAssignment.count({
        where: {
          status: "PENDING_APPROVAL",
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        unreviewedSubmissions,
        pendingSettlements,
        pendingApprovals,
      },
    });
  }

  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "접근 권한이 없습니다." } },
    { status: 403 }
  );
}
