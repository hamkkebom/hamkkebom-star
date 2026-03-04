import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { WorkflowDashboard } from "@/components/admin/workflow-dashboard";
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

      <WorkflowDashboard counts={counts} />

      {/* 광고 가능 영상 현황 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/60">
            <CheckCircle2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">광고 가능 영상</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{adEligibleCount}개</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <XCircle className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">광고 불가 영상</p>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{adIneligibleCount}개</p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground/50">
        <p>Dashboard updated at {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
