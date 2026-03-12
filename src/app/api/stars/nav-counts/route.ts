import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * STAR 네비게이션 배지 카운트를 한 번에 반환합니다.
 * - pendingApplications: 승인 대기 중인 지원 (PENDING_APPROVAL)
 * - activeProjects: 진행 중인 프로젝트 (ACCEPTED, IN_PROGRESS, SUBMITTED)
 * - unreadFeedbacks: 미확인 피드백
 */
export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  if (user.role !== "STAR") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "STAR만 접근할 수 있습니다." } },
      { status: 403 }
    );
  }

  const [pendingApplications, activeProjects, unreadFeedbacks] = await Promise.all([
    // 승인 대기 중인 지원
    prisma.projectAssignment.count({
      where: {
        starId: user.id,
        status: "PENDING_APPROVAL",
      },
    }),
    // 진행 중인 프로젝트 (배정됨~제출됨)
    prisma.projectAssignment.count({
      where: {
        starId: user.id,
        status: { in: ["ACCEPTED", "IN_PROGRESS", "SUBMITTED"] },
      },
    }),
    // 미확인 피드백
    prisma.feedback.count({
      where: {
        submission: {
          starId: user.id,
        },
        seenByStarAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      pendingApplications,
      activeProjects,
      unreadFeedbacks,
    },
  });
}
