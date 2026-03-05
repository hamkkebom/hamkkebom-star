import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { WorkflowDashboard } from "@/components/admin/workflow-dashboard";
import { AdminMobileDashboard } from "@/components/admin/mobile-dashboard";
import { SubmissionStatus } from "@/generated/prisma/client";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getAuthUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  // 상태별 제출물 카운트 조회
  const groupData = await prisma.submission.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
  });

  // 데이터를 Record<SubmissionStatus, number> 형태로 변환
  // 초기값 0 설정
  const counts: Record<SubmissionStatus, number> = {
    PENDING: 0,
    IN_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    REVISED: 0,
  };

  groupData.forEach((group) => {
    if (group.status in counts) {
      counts[group.status as SubmissionStatus] = group._count.status;
    }
  });

  // 광고 가능 영상 카운트
  const adEligibleCount = await prisma.video.count({
    where: { status: "APPROVED", adEligible: true },
  });
  const adIneligibleCount = await prisma.video.count({
    where: { status: "APPROVED", adEligible: false },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          Submission Workflow 및 상태별 라이브 현황판
        </p>
      </div>

      <div className="hidden md:block">
        <WorkflowDashboard counts={counts} adEligibleCount={adEligibleCount} adIneligibleCount={adIneligibleCount} />
      </div>

      <div className="block md:hidden">
        <AdminMobileDashboard counts={counts} adEligibleCount={adEligibleCount} adIneligibleCount={adIneligibleCount} />
      </div>

      <div className="text-center text-xs text-muted-foreground/50 pb-8 md:pb-0">
        <p>Dashboard updated at {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
