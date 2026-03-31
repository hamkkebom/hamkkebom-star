"use client";

import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  Search,
  Inbox,
  CheckCircle2,
  XCircle,
  Hourglass,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// --- Types ---
type Assignment = {
  id: string;
  status: string;
  createdAt: string;
  request: {
    id: string;
    title: string;
    categories: string[];
    deadline: string;
    estimatedBudget: number | null;
    maxAssignees: number;
    status: string;
    requirements: string | null;
    _count: { assignments: number };
  };
};

type AssignmentResponse = {
  data: Assignment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// --- Constants ---
const STATUS_TABS = [
  { id: "ALL", label: "전체", dot: "", badgeColor: "", gradient: "from-amber-500 to-orange-500", group: "all" },
  { id: "PENDING_APPROVAL", label: "승인 대기", dot: "bg-amber-500", badgeColor: "bg-amber-500", gradient: "from-amber-400 to-orange-500", group: "apply" },
  { id: "ACCEPTED", label: "배정됨", dot: "bg-emerald-500", badgeColor: "bg-emerald-500", gradient: "from-emerald-400 to-emerald-600", group: "work" },
  { id: "IN_PROGRESS", label: "작업중", dot: "bg-blue-500", badgeColor: "bg-blue-500", gradient: "from-blue-400 to-indigo-600", group: "work" },
  { id: "SUBMITTED", label: "제출됨", dot: "bg-violet-500", badgeColor: "bg-violet-500", gradient: "from-violet-400 to-purple-600", group: "work" },
  { id: "COMPLETED", label: "완료", dot: "bg-teal-500", badgeColor: "bg-teal-500", gradient: "from-teal-400 to-cyan-600", group: "done" },
  { id: "REJECTED", label: "거절됨", dot: "bg-red-500", badgeColor: "bg-red-500", gradient: "from-red-400 to-rose-600", group: "end" },
  { id: "CANCELLED", label: "취소됨", dot: "bg-zinc-400", badgeColor: "bg-zinc-400", gradient: "from-zinc-400 to-zinc-500", group: "end" },
] as const;

const assignmentStatusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING_APPROVAL: {
    label: "승인 대기",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Hourglass,
  },
  ACCEPTED: {
    label: "배정됨",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  IN_PROGRESS: {
    label: "작업중",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock,
  },
  SUBMITTED: {
    label: "제출됨",
    color:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    icon: CheckCircle2,
  },
  COMPLETED: {
    label: "완료",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "거절됨",
    color:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  CANCELLED: {
    label: "취소됨",
    color:
      "bg-muted text-muted-foreground",
    icon: XCircle,
  },
};

// --- Data fetching ---
async function fetchMyAssignments(
  status: string,
  page: number
): Promise<AssignmentResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
  });
  if (status !== "ALL") {
    params.set("status", status);
  }

  const res = await fetch(
    `/api/projects/my-assignments?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("데이터를 불러오지 못했습니다.");
  return res.json();
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(dl.getFullYear(), dl.getMonth(), dl.getDate());
  return Math.round((deadlineDay.getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24));
}

// --- Components ---

function ApplicationCard({
  assignment,
  index,
}: {
  assignment: Assignment;
  index: number;
}) {
  const req = assignment.request;
  const config = assignmentStatusConfig[assignment.status] ?? {
    label: assignment.status,
    color: "bg-muted text-foreground",
    icon: Clock,
  };
  const StatusIcon = config.icon;
  const daysLeft = getDaysLeft(req.deadline);
  const isUrgent = daysLeft <= 3 && daysLeft >= 0;
  const isExpired = daysLeft < 0;
  const showGoToWork =
    assignment.status === "ACCEPTED" || assignment.status === "IN_PROGRESS";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link href={`/stars/request-detail/${req.id}`}>
        <div
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300",
            "hover:shadow-lg hover:border-violet-500/30 dark:hover:shadow-[0_8px_30px_-12px_rgba(124,58,237,0.3)]",
            assignment.status === "PENDING_APPROVAL" &&
              "border-amber-500/20 bg-amber-500/[0.02]",
            assignment.status === "REJECTED" &&
              "border-red-500/10 opacity-70"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {req.title}
            </h3>
            <Badge className={cn("shrink-0 text-[10px] font-bold gap-1", config.color)}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>
          </div>

          {/* Categories */}
          {req.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {req.categories.slice(0, 3).map((cat) => (
                <span
                  key={cat}
                  className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {cat}
                </span>
              ))}
              {req.categories.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{req.categories.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Info Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              마감{" "}
              <span
                className={cn(
                  "font-medium",
                  isExpired && "text-red-500",
                  isUrgent && !isExpired && "text-amber-500"
                )}
              >
                {isExpired
                  ? "마감됨"
                  : daysLeft === 0
                    ? "D-Day"
                    : `D-${daysLeft}`}
              </span>
            </span>

            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {req._count.assignments}/{req.maxAssignees}명
            </span>

            {req.estimatedBudget && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {Intl.NumberFormat("ko-KR").format(req.estimatedBudget)}원
              </span>
            )}

            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              지원일 {formatDate(assignment.createdAt)}
            </span>
          </div>

          {/* CTA for assigned */}
          {showGoToWork && (
            <div className="mt-4 flex items-center justify-end">
              <span className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:gap-2 transition-all">
                작업실로 이동
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          )}

          {/* Subtle glow for pending */}
          {assignment.status === "PENDING_APPROVAL" && (
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// --- Main Page ---
export default function MyApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-assignments", statusFilter],
    queryFn: () => fetchMyAssignments(statusFilter, 1),
  });

  // 클라이언트사이드 필터링 (검색만)
  const filteredAssignments = data?.data.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return a.request.title.toLowerCase().includes(q);
    }
    return true;
  });

  // 상태별 개별 카운트 (ALL 데이터 기반)
  const { data: allData } = useQuery({
    queryKey: ["my-assignments", "ALL"],
    queryFn: () => fetchMyAssignments("ALL", 1),
    enabled: statusFilter !== "ALL",
  });

  const countSource = statusFilter === "ALL" ? data : allData;
  const statusCounts = {
    PENDING_APPROVAL: countSource?.data.filter((a) => a.status === "PENDING_APPROVAL").length ?? 0,
    ACCEPTED: countSource?.data.filter((a) => a.status === "ACCEPTED").length ?? 0,
    IN_PROGRESS: countSource?.data.filter((a) => a.status === "IN_PROGRESS").length ?? 0,
    SUBMITTED: countSource?.data.filter((a) => a.status === "SUBMITTED").length ?? 0,
    COMPLETED: countSource?.data.filter((a) => a.status === "COMPLETED").length ?? 0,
    REJECTED: countSource?.data.filter((a) => a.status === "REJECTED").length ?? 0,
    CANCELLED: countSource?.data.filter((a) => a.status === "CANCELLED").length ?? 0,
  };

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* Header */}
      <div className="space-y-2 pt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-bold"
        >
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-400/10 text-xs">
            📋
          </span>
          <span className="text-xs">지원 현황 관리</span>
        </motion.div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter">
             지원 현황
            <span className="text-amber-500">.</span>
          </h1>

          {/* Search */}
          <div className="relative group w-full md:w-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500" />
            <div className="relative flex items-center bg-background dark:bg-black rounded-xl p-1 border border-border w-full sm:w-auto">
              <Search className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
              <input
                type="text"
                placeholder="프로젝트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm p-2.5 sm:p-2 w-full sm:w-[200px] text-foreground placeholder:text-muted-foreground/50 h-10 sm:h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-3 border-b border-border pb-4">
        {/* 워크플로우 요약 */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Hourglass className="w-3 h-3" />
            지원 {statusCounts.PENDING_APPROVAL}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3" />
            진행 {statusCounts.ACCEPTED + statusCounts.IN_PROGRESS + statusCounts.SUBMITTED}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="w-3 h-3" />
            완료 {statusCounts.COMPLETED}
          </span>
          <div className="hidden sm:block w-px h-4 bg-border/50 mx-1" />
          <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-500/10 text-muted-foreground">
            <XCircle className="w-3 h-3" />
            종료 {statusCounts.REJECTED + statusCounts.CANCELLED}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Filter className="w-3.5 h-3.5" />
            {filteredAssignments?.length ?? 0}건
          </span>
        </div>

        {/* 필터 칩바 */}
        <div className="w-[calc(100vw-32px)] sm:w-auto overflow-x-auto pb-2 -mb-2 scrollbar-hide">
          <div className="flex p-1 sm:p-1.5 bg-zinc-100 dark:bg-card rounded-2xl border border-zinc-200 dark:border-border w-max gap-0.5">
            {STATUS_TABS.map((tab, index) => {
              const prevGroup = index > 0 ? STATUS_TABS[index - 1].group : null;
              const showSeparator = prevGroup !== null && prevGroup !== tab.group;
              const isActive = statusFilter === tab.id;
              const count =
                tab.id === "ALL"
                  ? null
                  : statusCounts[tab.id as keyof typeof statusCounts] ?? 0;

              return (
                <Fragment key={tab.id}>
                  {showSeparator && (
                    <div className="w-px h-5 bg-border/60 mx-0.5 self-center shrink-0" />
                  )}
                  <button
                    onClick={() => setStatusFilter(tab.id)}
                    className={cn(
                      "relative px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all duration-300 flex items-center gap-1.5 select-none active:scale-95 whitespace-nowrap",
                      isActive
                        ? "text-white shadow-lg"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="applicationFilterBg"
                        className={cn(
                          "absolute inset-0 rounded-xl bg-gradient-to-r shadow-lg",
                          tab.gradient
                        )}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {tab.dot && !isActive && (
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tab.dot)} />
                      )}
                      {tab.label}
                      {count !== null && count > 0 && !isActive && (
                        <span className={cn(
                          "ml-0.5 min-w-4 h-4 px-1 text-[9px] font-black text-white rounded-full inline-flex items-center justify-center",
                          tab.badgeColor
                        )}>
                          {count}
                        </span>
                      )}
                    </span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-40 rounded-2xl bg-zinc-100 dark:bg-secondary/30"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-red-500/30 bg-red-500/5 rounded-2xl">
          <XCircle className="w-12 h-12 text-red-500 mb-4 opacity-50" />
          <h3 className="text-xl font-bold">데이터 로드 실패</h3>
          <p className="text-muted-foreground mt-1">
            네트워크 상태를 확인해주세요.
          </p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredAssignments?.map((assignment, idx) => (
              <ApplicationCard
                key={assignment.id}
                assignment={assignment}
                index={idx}
              />
            ))}
          </AnimatePresence>

          {filteredAssignments?.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 mb-4">
                <Inbox className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-1">지원 내역이 없습니다</h3>
              <p className="text-muted-foreground text-sm mb-4">
                의뢰 게시판에서 프로젝트를 찾아 지원해보세요!
              </p>
              <Link
                href="/stars/project-board"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 dark:text-violet-400 hover:gap-2.5 transition-all"
              >
                의뢰 게시판 바로가기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
