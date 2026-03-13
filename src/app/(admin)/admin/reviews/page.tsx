"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { motion, AnimatePresence } from "framer-motion";

import { toast } from "sonner";
import {
  Clock,
  Eye,
  CheckCircle2,
  LayoutGrid,
  Download,
  Loader2,
  Film,
  X,
  Edit,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VideoPlayer } from "@/components/video/video-player";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { MobileReviewList, type MobileSubmissionRow } from "@/components/admin/mobile-review-list";
import { MobileReviewSkeleton } from "@/components/admin/mobile-review-skeleton";
import { cn } from "@/lib/utils";

// ============================================================
//  TYPES (exported — do not change)
// ============================================================
export type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";

export type SubmissionRow = {
  id: string;
  versionSlot: number;
  version: string;
  versionTitle: string | null;
  streamUid: string;
  thumbnailUrl?: string | null;
  signedThumbnailUrl?: string | null;
  status: SubmissionStatus;
  createdAt: string;
  star: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
  };
  assignment: {
    request: {
      id: string;
      title: string;
    };
  } | null;
  video: {
    title: string;
    streamUid?: string | null;
    adEligible?: boolean;
  } | null;
  feedbacks?: Array<{
    id: string;
    status: string;
  }>;
  _count: {
    feedbacks: number;
  };
};

type SubmissionsResponse = {
  data: SubmissionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts?: {
    pending: number;
    inReview: number;
    completed: number;
    total: number;
  };
};

// ============================================================
//  CONSTANTS
// ============================================================
const statusLabels: Record<SubmissionStatus, string> = {
  PENDING: "대기중",
  IN_REVIEW: "피드백중",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
  REVISED: "수정됨",
};

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { icon: typeof Clock; pillBg: string; pillText: string; animate?: boolean }
> = {
  PENDING: {
    icon: Clock,
    pillBg: "bg-amber-100 dark:bg-amber-500/15",
    pillText: "text-amber-700 dark:text-amber-400",
  },
  IN_REVIEW: {
    icon: Eye,
    pillBg: "bg-indigo-100 dark:bg-indigo-500/15",
    pillText: "text-indigo-700 dark:text-indigo-400",
    animate: true,
  },
  APPROVED: {
    icon: CheckCircle2,
    pillBg: "bg-emerald-100 dark:bg-emerald-500/15",
    pillText: "text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    icon: X,
    pillBg: "bg-rose-100 dark:bg-rose-500/15",
    pillText: "text-rose-700 dark:text-rose-400",
  },
  REVISED: {
    icon: Edit,
    pillBg: "bg-slate-100 dark:bg-slate-500/15",
    pillText: "text-slate-700 dark:text-slate-400",
  },
};

const FILTERS = [
  { key: "PENDING", label: "대기중", icon: Clock },
  { key: "IN_REVIEW", label: "피드백중", icon: Eye },
  { key: "COMPLETED", label: "승인/반려", icon: CheckCircle2 },
  { key: "ALL", label: "전체", icon: LayoutGrid },
];

// ============================================================
//  HELPERS
// ============================================================
function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

async function fetchAllSubmissions(status: string, page: number): Promise<SubmissionsResponse> {
  const url = status === "ALL"
    ? `/api/submissions?page=${page}&pageSize=50`
    : `/api/submissions?page=${page}&pageSize=50&status=${status}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("제출물 목록을 불러오지 못했습니다.");
  const data = (await res.json()) as SubmissionsResponse;

  // Ensure feedbacks array exists for each row (fallback to empty array)
  return {
    ...data,
    data: data.data.map(row => ({
      ...row,
      feedbacks: row.feedbacks || []
    }))
  };
}

function getThumbnailUrl(_row: SubmissionRow): string | null {
  // CF Stream 서명 없이 접근 시 401 에러 발생하므로 null 반환
  return null;
}

// ============================================================
//  STATUS PILL
// ============================================================
function StatusPill({ status }: { status: SubmissionStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
        config.pillBg,
        config.pillText,
        config.animate && "animate-pulse"
      )}
    >
      <Icon className="w-3 h-3" />
      {statusLabels[status]}
    </span>
  );
}

// ============================================================
//  FEEDBACK PROGRESS BAR
// ============================================================
function FeedbackProgress({ feedbacks, totalCount }: { feedbacks: Array<{ id: string; status: string }>; totalCount: number }) {
  if (totalCount === 0) {
    return <span className="text-xs text-muted-foreground">0건</span>;
  }
  const resolved = feedbacks.filter(f => f.status === "RESOLVED").length;
  const pct = Math.round((resolved / totalCount) * 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-muted-foreground whitespace-nowrap">
        {resolved}/{totalCount}
      </span>
    </div>
  );
}

// ============================================================
//  THUMBNAIL CELL
// ============================================================
function ThumbnailCell({ row }: { row: SubmissionRow }) {
  const [imgError, setImgError] = useState(false);
  const url = getThumbnailUrl(row);

  if (!url || imgError) {
    return (
      <div className="w-[60px] h-[34px] rounded bg-muted flex items-center justify-center flex-shrink-0">
        <Film className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="thumbnail"
      width={60}
      height={34}
      className="w-[60px] h-[34px] rounded object-cover flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

// ============================================================
//  MAIN PAGE COMPONENT
// ============================================================
export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
  const [rejectReason, setRejectReason] = useState("");
  const handleTimeUpdate = useCallback((t: number) => setCurrentTime(t), []);

  const [isDownloading, setIsDownloading] = useState(false);

  const [filter, setFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRejectDialogOpen, setIsBulkRejectDialogOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-submissions", filter, page],
    queryFn: () => fetchAllSubmissions(filter, page),
  });

  // ── Stats computation ──
  const stats = useMemo(() => {
    if (data?.statusCounts) {
      return {
        total: data.statusCounts.total,
        pending: data.statusCounts.pending,
        inReview: data.statusCounts.inReview,
        completed: data.statusCounts.completed,
      };
    }
    // fallback: 현재 페이지 데이터로 계산
    const rows = data?.data ?? [];
    const total = data?.total ?? 0;
    return {
      total,
      pending: rows.filter(r => r.status === "PENDING").length,
      inReview: rows.filter(r => r.status === "IN_REVIEW").length,
      completed: rows.filter(r => ["APPROVED", "REJECTED", "REVISED"].includes(r.status)).length,
    };
  }, [data]);

  // ── Mutations (unchanged) ──
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/approve`, { method: "PATCH" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "승인에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("제출물이 승인되었습니다.");
      setSelectedSubmission(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "승인에 실패했습니다.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "관리자 반려" }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "반려에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("제출물이 반려되었습니다.");
      setSelectedSubmission(null);
      setRejectReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "반려에 실패했습니다.");
    },
  });

  const cancelReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}/cancel-review`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "상태 취소에 실패했습니다.");
      }
      return (await res.json()).data as SubmissionRow;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-submissions"] });
      const previousData = queryClient.getQueryData<SubmissionsResponse>(["admin-submissions", filter, page]);

      // Optimistic update for the list
      queryClient.setQueryData<SubmissionsResponse>(["admin-submissions", filter, page], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((sub) => {
            if (sub.id === id) {
              const newStatus = sub._count.feedbacks > 0 ? "IN_REVIEW" : "PENDING";
              return { ...sub, status: newStatus as SubmissionStatus };
            }
            return sub;
          }),
        };
      });

      // Optimistic update for the dialog
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => {
          if (!prev) return prev;
          const newStatus = prev._count.feedbacks > 0 ? "IN_REVIEW" : "PENDING";
          return { ...prev, status: newStatus as SubmissionStatus };
        });
      }

      return { previousData };
    },
    onSuccess: () => {
      toast.success("처리가 취소되었습니다.");
    },
    onError: (err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["admin-submissions", filter, page], context.previousData);
      }
      toast.error(err instanceof Error ? err.message : "상태 취소에 실패했습니다.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, reason }: { action: "APPROVE" | "REJECT"; reason?: string }) => {
      const res = await fetch("/api/submissions/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "일괄 처리에 실패했습니다.");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const { approved, rejected, failed } = data.data;
      const successCount = approved + rejected;
      if (successCount > 0) {
        toast.success(`${successCount}건 처리되었습니다.`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length}건 처리 실패`);
      }
      setSelectedIds(new Set());
      setIsBulkRejectDialogOpen(false);
      setBulkRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "일괄 처리에 실패했습니다.");
    },
  });

  const rows = data?.data ?? [];

  const selectableRows = rows.filter(r => ["PENDING", "IN_REVIEW", "REVISED"].includes(r.status));
  const isAllSelected = selectableRows.length > 0 && selectableRows.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set(selectedIds);
      selectableRows.forEach(r => newSet.add(r.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Mobile list rows — mapped for MobileReviewList
  const mobileRows: MobileSubmissionRow[] = rows.map(row => ({
    id: row.id,
    version: row.version,
    versionTitle: row.versionTitle,
    status: row.status,
    createdAt: row.createdAt,
    streamUid: row.streamUid,
    thumbnailUrl: row.signedThumbnailUrl ?? null,
    star: row.star,
    assignment: row.assignment,
    video: row.video,
    _count: row._count,
  }));

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="space-y-8">
      {/* ════════════════════ COMMAND CENTER HEADER ════════════════════ */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-black tracking-tight"
          >
            전체 피드백{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-400">
              관리
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-muted-foreground mt-1.5 max-w-lg"
          >
            제출된 영상들을 부서 구분 없이 모두 확인하고 리뷰합니다.
          </motion.p>
        </div>

        {/* Stat Orbs */}
        <div className="flex gap-3 sm:gap-4 flex-wrap">
          {[
            { label: "전체", value: stats.total, gradient: "from-slate-500 to-slate-400", ring: "ring-slate-300/40 dark:ring-slate-500/20", icon: TrendingUp, iconColor: "text-slate-500" },
            { label: "대기중", value: stats.pending, gradient: "from-amber-500 to-orange-400", ring: "ring-amber-300/40 dark:ring-amber-500/20", icon: Clock, iconColor: "text-amber-500" },
            { label: "피드백중", value: stats.inReview, gradient: "from-indigo-500 to-purple-400", ring: "ring-indigo-300/40 dark:ring-indigo-500/20", icon: Zap, iconColor: "text-indigo-500" },
            { label: "승인/반려", value: stats.completed, gradient: "from-emerald-500 to-teal-400", ring: "ring-emerald-300/40 dark:ring-emerald-500/20", icon: CheckCircle2, iconColor: "text-emerald-500" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, type: "spring", stiffness: 220 }}
              className={cn(
                "relative flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl",
                "bg-card border border-border",
                "hover:bg-muted transition-all duration-300 hover:scale-105 shadow-sm"
              )}
            >
              <stat.icon className={cn("w-4 h-4 mb-1", stat.iconColor)} />
              <span className={cn("text-xl sm:text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent", stat.gradient)}>
                {stat.value}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">
                {stat.label}
              </span>
            </motion.div>
          ))}

          {/* CSV export — subtle ghost */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-end"
          >
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => {
                window.open("/api/submissions/export", "_blank");
                toast.success("CSV 다운로드가 시작되었습니다.");
              }}
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
          </motion.div>
        </div>
      </header>

      {/* ════════════════════ FILTER TABS ════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="hidden md:flex p-1 bg-card rounded-2xl border border-border shadow-sm overflow-x-auto w-full sm:w-auto scrollbar-none"
      >
        {FILTERS.map((tab) => {
          const isActive = filter === tab.key;
          const Icon = tab.icon;
          const count = tab.key === "PENDING"
            ? stats.pending
            : tab.key === "IN_REVIEW"
              ? stats.inReview
              : tab.key === "COMPLETED"
                ? stats.completed
                : stats.total;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-reviews-filter"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className={cn("w-4 h-4", isActive ? "opacity-100" : "opacity-70")} />
                {tab.label}
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* ════════════════════ CONTENT ════════════════════ */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-[60px] h-[34px] rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-500/10 px-6 py-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            {error instanceof Error ? error.message : "데이터를 불러오지 못했습니다."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-submissions"] })}
            className="mt-2"
          >
            다시 시도
          </Button>
        </motion.div>
      ) : (
        <>
          {/* ════════ MOBILE LIST (md 미만) ════════ */}
          <MobileReviewList
            rows={mobileRows}
            filter={filter}
            onFilterChange={(f) => { setFilter(f); setPage(1); }}
            stats={stats}
            queryKey={["admin-submissions"]}
          />

          {/* ═══════════ TABLE (md 이상) ═══════════ */}
          <Card className={cn(
            "border-border bg-card overflow-hidden shadow-sm",
            rows.length > 0 ? "hidden md:block" : ""
          )}>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/50">
                    <TableHead className="w-12 pl-4">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={selectableRows.length === 0}
                      />
                    </TableHead>
                    <TableHead className="w-[76px]">미리보기</TableHead>
                    <TableHead>프로젝트</TableHead>
                    <TableHead>STAR</TableHead>
                    <TableHead>버전</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>피드백</TableHead>
                    <TableHead>제출일</TableHead>
                    <TableHead className="text-right pr-4">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-20">
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                            <Inbox className="w-7 h-7 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            제출된 영상이 없습니다.
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            다른 필터 탭을 확인해보세요.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const projectTitle = row.versionTitle || row.assignment?.request?.title || row.video?.title || `v${row.version.replace(/^v/i, "")}`;
                      const showSubtitle = row.assignment?.request?.title && row.versionTitle;
                      const feedbacks = row.feedbacks || [];

                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            "group/row border-border transition-all duration-200",
                            "hover:bg-muted/50"
                          )}
                        >
                          <TableCell className="pl-4">
                            {["PENDING", "IN_REVIEW", "REVISED"].includes(row.status) ? (
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={() => toggleSelect(row.id)}
                              />
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <ThumbnailCell row={row} />
                          </TableCell>
                          <TableCell className="max-w-[200px] font-medium">
                            <div className="truncate" title={projectTitle}>
                              {projectTitle}
                            </div>
                            {showSubtitle && (
                              <div className="text-xs text-muted-foreground truncate mt-0.5" title={row.assignment!.request.title}>
                                {row.assignment!.request.title}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/stars/${row.star.id}`}
                              className="hover:underline text-primary text-sm"
                            >
                              {row.star.chineseName || row.star.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs font-bold bg-muted border-border px-2"
                            >
                              v{row.version.replace(/^v/i, "")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusPill status={row.status} />
                              {row.status === "APPROVED" && row.video && (
                                <Badge className={cn(
                                  "border-none shadow-none text-xs",
                                  row.video.adEligible
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {row.video.adEligible ? "광고 가능" : "광고 불가"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <FeedbackProgress feedbacks={feedbacks} totalCount={row._count.feedbacks} />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(row.createdAt)}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true, locale: ko })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Link href={`/admin/reviews/${row.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg text-xs font-semibold"
                              >
                                리뷰
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ════════════════════ PAGINATION ════════════════════ */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 mb-8">
          <span className="text-sm font-medium text-muted-foreground">
            총 <span className="font-bold text-foreground">{data.total}</span>건 ({data.page} / {data.totalPages})
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
                setSelectedIds(new Set());
              }}
              className="w-9 h-9 p-0 rounded-xl hidden sm:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page Numbers */}
            {Array.from({ length: 5 }, (_, i) => {
              const maxVisiblePages = 5;
              let startPage = Math.max(1, data.page - Math.floor(maxVisiblePages / 2));
              let endPage = startPage + maxVisiblePages - 1;

              if (endPage > data.totalPages) {
                endPage = data.totalPages;
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              const pageNum = startPage + i;
              if (pageNum > endPage) return null;

              const isActivePage = data.page === pageNum;

              return (
                <Button
                  key={pageNum}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPage(pageNum);
                    setSelectedIds(new Set());
                  }}
                  className={cn(
                    "w-9 h-9 p-0 rounded-xl text-sm font-semibold",
                    isActivePage
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:text-white hover:from-indigo-700 hover:to-purple-700 pointer-events-none"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="ghost"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => {
                setPage(p => p + 1);
                setSelectedIds(new Set());
              }}
              className="w-9 h-9 p-0 rounded-xl hidden sm:flex"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════════ FLOATING BULK ACTION BAR ════════════════════ */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 bg-card/95 backdrop-blur-xl border border-border rounded-full shadow-xl"
          >
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-sm font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium text-muted-foreground">건 선택</span>

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 font-bold shadow-lg shadow-emerald-500/20"
              onClick={() => bulkActionMutation.mutate({ action: "APPROVE" })}
              disabled={bulkActionMutation.isPending}
            >
              일괄 승인
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full px-5 font-bold shadow-lg shadow-red-500/20"
              onClick={() => setIsBulkRejectDialogOpen(true)}
              disabled={bulkActionMutation.isPending}
            >
              일괄 반려
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════ BULK REJECT DIALOG ════════════════════ */}
      <ResponsiveModal
        open={isBulkRejectDialogOpen}
        onOpenChange={setIsBulkRejectDialogOpen}
        title="일괄 반려"
        description={`${selectedIds.size}건의 제출물을 반려합니다.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="bulk-reject-reason" className="text-sm font-semibold text-foreground">
              반려 사유
            </label>
            <textarea
              id="bulk-reject-reason"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              rows={3}
              placeholder="반려 사유를 입력하세요..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsBulkRejectDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => bulkActionMutation.mutate({ action: "REJECT", reason: bulkRejectReason || "관리자 일괄 반려" })}
              disabled={bulkActionMutation.isPending}
              className="rounded-lg"
            >
              {bulkActionMutation.isPending ? "처리 중..." : "반려 확인"}
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* ════════════════════ REVIEW MODAL ════════════════════ */}
      {selectedSubmission && (
        <ResponsiveModal
          open={Boolean(selectedSubmission)}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
          title={(() => {
            const title = selectedSubmission.versionTitle || selectedSubmission.assignment?.request?.title || selectedSubmission.video?.title || `v${selectedSubmission.version.replace(/^v/i, "")}`;
            const subtitle = selectedSubmission.assignment?.request?.title && selectedSubmission.versionTitle ? selectedSubmission.assignment.request.title : null;
            return subtitle ? `${title} — ${subtitle}` : `${title} — v${selectedSubmission.version.replace(/^v/i, "")}`;
          })()}
          description={`${selectedSubmission.star.chineseName || selectedSubmission.star.name} (${selectedSubmission.star.email})`}
          className="max-h-[95vh] overflow-y-auto sm:max-w-5xl"
        >
          <div className="space-y-5">
            <VideoPlayer
              streamUid={selectedSubmission.streamUid}
              onTimeUpdate={handleTimeUpdate}
              seekTo={seekTo}
            />

            {/* ─── Action Toolbar ─── */}
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-muted border border-border">
              {(selectedSubmission.status === "PENDING" ||
                selectedSubmission.status === "IN_REVIEW" ||
                selectedSubmission.status === "REVISED") && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-sm"
                      onClick={() => approveMutation.mutate(selectedSubmission.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {approveMutation.isPending ? "승인 중..." : "승인"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-lg font-semibold shadow-sm"
                      onClick={() => rejectMutation.mutate({ id: selectedSubmission.id, reason: rejectReason })}
                      disabled={rejectMutation.isPending || !rejectReason.trim()}
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      {rejectMutation.isPending ? "반려 중..." : "반려"}
                    </Button>
                  </>
                )}

              {(selectedSubmission.status === "APPROVED" ||
                selectedSubmission.status === "REJECTED") && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-lg font-semibold"
                    onClick={() => cancelReviewMutation.mutate(selectedSubmission.id)}
                    disabled={cancelReviewMutation.isPending}
                  >
                    {cancelReviewMutation.isPending
                      ? "취소 중..."
                      : selectedSubmission.status === "APPROVED"
                        ? "승인 취소"
                        : "반려 취소"}
                  </Button>
                )}

              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

              <Button
                size="sm"
                variant="outline"
                className="rounded-lg font-semibold"
                onClick={async () => {
                  setIsDownloading(true);
                  try {
                    const a = document.createElement("a");
                    a.href = `/api/submissions/${selectedSubmission.id}/download`;
                    a.download = "";
                    a.click();
                    toast.success("다운로드가 시작되었습니다.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "다운로드에 실패했습니다.");
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />다운로드 중...</>
                ) : (
                  <><Download className="mr-1.5 h-4 w-4" />영상 다운로드</>
                )}
              </Button>
            </div>

            {/* ─── Reject Reason ─── */}
            <div className="space-y-2">
              <label htmlFor="reject-reason" className="text-sm font-semibold text-foreground">
                반려 사유
              </label>
              <textarea
                id="reject-reason"
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                rows={2}
                placeholder="반려 사유를 입력하세요..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            {/* ─── Feedback Form ─── */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">피드백 작성</CardTitle>
                <CardDescription>현재 시점에 피드백을 남기세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <FeedbackForm
                  submissionId={selectedSubmission.id}
                  currentTime={currentTime}
                  onSubmitted={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["feedbacks", selectedSubmission.id],
                    });
                  }}
                />
              </CardContent>
            </Card>

            {/* ─── Feedback List ─── */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">피드백 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <FeedbackList
                  submissionId={selectedSubmission.id}
                  onTimecodeClick={setSeekTo}
                />
              </CardContent>
            </Card>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
}
