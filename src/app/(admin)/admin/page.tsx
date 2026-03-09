import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { WorkflowDashboard } from "@/components/admin/workflow-dashboard";
import { AdminMobileDashboard } from "@/components/admin/mobile-dashboard";
import { SubmissionStatus } from "@/generated/prisma/client";
import {
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  Clock,
  CreditCard,
  TrendingUp,
  FileText,
  Video,
} from "lucide-react";

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

  // ── 추가 KPI 데이터 ──
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalStars,
    pendingApprovals,
    totalVideos,
    thisMonthSubmissions,
    thisWeekSubmissions,
    thisMonthSettlements,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STAR", isApproved: true } }),
    prisma.user.count({ where: { role: "STAR", isApproved: false } }),
    prisma.video.count({ where: { status: "APPROVED" } }),
    prisma.submission.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.submission.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.settlement.aggregate({
      where: { startDate: { gte: monthStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  const settlementTotal = Number(thisMonthSettlements._sum.totalAmount ?? 0);
  const settlementCount = thisMonthSettlements._count;

  const kpiCards = [
    {
      icon: "Users",
      label: "활동 STAR",
      value: totalStars,
      sub: `가입 대기 ${pendingApprovals}명`,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
      alert: pendingApprovals > 0,
    },
    {
      icon: "Video",
      label: "승인 영상",
      value: totalVideos,
      sub: `광고 가능 ${adEligibleCount}건`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: "FileText",
      label: "이번 달 제출",
      value: thisMonthSubmissions,
      sub: `이번 주 ${thisWeekSubmissions}건`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: "CreditCard",
      label: "이번 달 정산",
      value: settlementTotal > 0 ? `${Math.round(settlementTotal / 10000)}만원` : "-",
      sub: `${settlementCount}건 처리`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  const iconMap: Record<string, React.ElementType> = {
    Users,
    Video,
    FileText,
    CreditCard,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          Submission Workflow 및 상태별 라이브 현황판
        </p>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = iconMap[card.icon] || Users;
          return (
            <div
              key={card.label}
              className="relative p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden"
            >
              {card.alert && (
                <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                </div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-black tracking-tight">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
            </div>
          );
        })}
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
