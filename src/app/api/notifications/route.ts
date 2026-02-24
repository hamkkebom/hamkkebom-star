import { NextResponse } from "next/server";
import { FeedbackStatus, SubmissionStatus, SettlementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";

type NotificationItem = {
  id: string;
  type: "feedback" | "submission" | "settlement" | "assignment";
  title: string;
  description: string;
  createdAt: string;
  link: string;
};

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
      { status: 401 }
    );
  }

  const items: NotificationItem[] = [];

  if (user.role === "STAR") {
    // Recent feedbacks on my submissions
    const feedbacks = await prisma.feedback.findMany({
      where: {
        submission: { starId: user.id },
        status: FeedbackStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        type: true,
        createdAt: true,
        submission: {
          select: {
            id: true,
            versionTitle: true,
            version: true,
            assignment: {
              select: {
                request: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    for (const fb of feedbacks) {
      const subTitle = fb.submission.versionTitle || `v${fb.submission.version}`;
      const projectTitle = fb.submission?.assignment?.request?.title ?? '제목 없음';
      items.push({
        id: fb.id,
        type: "feedback",
        title: `새 피드백 — ${projectTitle}`,
        description: `${subTitle}: ${fb.content.substring(0, 60)}${fb.content.length > 60 ? "..." : ""}`,
        createdAt: fb.createdAt.toISOString(),
        link: `/stars/feedback`,
      });
    }

    // Recent settlement status changes
    const settlements = await prisma.settlement.findMany({
      where: { starId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        year: true,
        month: true,
        totalAmount: true,
        status: true,
        updatedAt: true,
      },
    });

    const settlementStatusLabels: Record<string, string> = {
      PENDING: "대기중",
      PROCESSING: "처리중",
      COMPLETED: "완료",
      CANCELLED: "취소됨",
    };

    for (const s of settlements) {
      items.push({
        id: s.id,
        type: "settlement",
        title: `정산 ${settlementStatusLabels[s.status] ?? s.status}`,
        description: `${s.year}년 ${String(s.month).padStart(2, "0")}월 정산`,
        createdAt: s.updatedAt.toISOString(),
        link: `/stars/earnings`,
      });
    }

    // Recent assignment approval/rejection (last 7 days)
    const recentAssignments = await prisma.projectAssignment.findMany({
      where: {
        starId: user.id,
        reviewedAt: {
          not: null,
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        status: { in: ["ACCEPTED", "REJECTED"] },
      },
      orderBy: { reviewedAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        request: { select: { title: true } },
      },
    });

    for (const assignment of recentAssignments) {
      if (assignment.status === "ACCEPTED") {
        items.push({
          id: assignment.id,
          type: "assignment",
          title: `프로젝트 승인됨 — ${assignment.request.title}`,
          description: "작업을 시작하세요!",
          createdAt: assignment.reviewedAt!.toISOString(),
          link: "/stars/upload",
        });
      } else if (assignment.status === "REJECTED") {
        items.push({
          id: assignment.id,
          type: "assignment",
          title: `프로젝트 지원 거절 — ${assignment.request.title}`,
          description: assignment.rejectionReason || "거절되었습니다.",
          createdAt: assignment.reviewedAt!.toISOString(),
          link: "/stars/upload",
        });
      }
    }
  }

  if (user.role === "ADMIN") {
    // Pending submissions needing review
    const submissions = await prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        versionTitle: true,
        version: true,
        createdAt: true,
        star: { select: { name: true } },
        assignment: {
          select: {
            request: { select: { title: true } },
          },
        },
      },
    });

    for (const sub of submissions) {
      const subTitle = sub.versionTitle || `v${sub.version}`;
      items.push({
        id: sub.id,
        type: "submission",
        title: `리뷰 대기 — ${sub?.assignment?.request?.title ?? '제목 없음'}`,
        description: `${sub.star.name} • ${subTitle}`,
        createdAt: sub.createdAt.toISOString(),
        link: `/admin/reviews/${sub.id}`,
      });
    }

    // Pending settlements
    const settlements = await prisma.settlement.findMany({
      where: { status: SettlementStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        year: true,
        month: true,
        totalAmount: true,
        createdAt: true,
        star: { select: { name: true } },
      },
    });

    for (const s of settlements) {
      items.push({
        id: s.id,
        type: "settlement",
        title: `정산 확정 대기`,
        description: `${s.star.name} • ${s.year}년 ${String(s.month).padStart(2, "0")}월`,
        createdAt: s.createdAt.toISOString(),
        link: `/admin/settlements`,
      });
    }

    // Pending assignment approvals
    const pendingAssignments = await prisma.projectAssignment.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        star: { select: { name: true } },
        request: { select: { title: true } },
      },
    });

    for (const assignment of pendingAssignments) {
      items.push({
        id: assignment.id,
        type: "assignment",
        title: `${assignment.star.name}님이 '${assignment.request.title}' 프로젝트에 지원했습니다.`,
        description: "승인 또는 거절해 주세요.",
        createdAt: assignment.createdAt.toISOString(),
        link: "/admin/approvals",
      });
    }
  }

  // Sort all items by date descending
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ data: items.slice(0, 20) });
}
