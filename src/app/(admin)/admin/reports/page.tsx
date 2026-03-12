"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Flag,
  Eye,
  FileText,
  MessageSquare,
  Video,
  User,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "DISMISSED"
  | "ESCALATED";

type ReportPriority = "HIGH" | "MEDIUM" | "LOW";

type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE"
  | "COPYRIGHT"
  | "OTHER";

type ReportTarget = "POST" | "COMMENT" | "VIDEO" | "USER";

type ActionType =
  | "DISMISS"
  | "WARNING"
  | "CONTENT_HIDDEN"
  | "CONTENT_REMOVED"
  | "TEMP_RESTRICT"
  | "TEMP_BAN"
  | "PERM_BAN";

type ReportRow = {
  id: string;
  status: ReportStatus;
  priority: ReportPriority;
  reason: ReportReason;
  targetType: ReportTarget;
  targetId: string;
  contentPreview: string;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  reporters: {
    id: string;
    name: string;
    email: string;
    reportedAt: string;
  }[];
  reportedUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    warningCount: number;
    sanctionCount: number;
    avatarUrl?: string | null;
  };
};

type ReportsResponse = {
  data: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    pending: number;
    underReview: number;
    todayResolved: number;
    escalated: number;
  };
  statusCounts: {
    all: number;
    PENDING: number;
    UNDER_REVIEW: number;
    ESCALATED: number;
  };
};

type FilterStatus = "all" | "PENDING" | "UNDER_REVIEW" | "ESCALATED";

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "접수 대기",
  UNDER_REVIEW: "검토 중",
  RESOLVED: "처리 완료",
  DISMISSED: "기각",
  ESCALATED: "에스컬레이션",
};

const PRIORITY_LABELS: Record<ReportPriority, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

const REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "스팸/홍보",
  HARASSMENT: "괴롭힘/비방",
  INAPPROPRIATE: "부적절",
  COPYRIGHT: "저작권 침해",
  OTHER: "기타",
};

const TARGET_LABELS: Record<ReportTarget, string> = {
  POST: "게시글",
  COMMENT: "댓글",
  VIDEO: "영상",
  USER: "사용자",
};

const ACTION_LABELS: Record<ActionType, string> = {
  DISMISS: "기각",
  WARNING: "경고",
  CONTENT_HIDDEN: "콘텐츠 숨김",
  CONTENT_REMOVED: "콘텐츠 삭제",
  TEMP_RESTRICT: "임시 제한",
  TEMP_BAN: "임시 정지",
  PERM_BAN: "영구 정지",
};

const DURATION_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "14", label: "14일" },
  { value: "30", label: "30일" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatShortDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function getStatusBadgeClass(status: ReportStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "UNDER_REVIEW":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "RESOLVED":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "DISMISSED":
      return "bg-muted text-muted-foreground";
    case "ESCALATED":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  }
}

function getPriorityBadgeClass(priority: ReportPriority): string {
  switch (priority) {
    case "HIGH":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "LOW":
      return "bg-muted text-muted-foreground";
  }
}

function getTargetIcon(target: ReportTarget) {
  switch (target) {
    case "POST":
      return FileText;
    case "COMMENT":
      return MessageSquare;
    case "VIDEO":
      return Video;
    case "USER":
      return User;
  }
}

// ---------------------------------------------------------------------------
// Stats cards config
// ---------------------------------------------------------------------------

const STATS_CARDS = [
  {
    key: "pending" as const,
    label: "접수 대기",
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "underReview" as const,
    label: "검토 중",
    icon: Eye,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "todayResolved" as const,
    label: "오늘 처리",
    icon: CheckCircle2,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "escalated" as const,
    label: "에스컬레이션",
    icon: ArrowUpRight,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminReportsPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  // Action panel state
  const [actionType, setActionType] = useState<ActionType>("DISMISS");
  const [actionDuration, setActionDuration] = useState("7");
  const [actionReason, setActionReason] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);

  // Bulk dialog
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    action: "dismiss" | "escalate";
  }>({ open: false, action: "dismiss" });

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selections on filter/page change
  useEffect(() => {
    setSelectedIds(new Set()); // eslint-disable-line react-hooks/set-state-in-effect -- reset on filter change
  }, [statusFilter, page]);

  // Filter change handler
  const handleStatusChange = useCallback(
    (newFilter: FilterStatus) => {
      if (newFilter === statusFilter) return;
      setStatusFilter(newFilter);
      setPage(1);
    },
    [statusFilter]
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const queryKey = [
    "admin-reports",
    debouncedSearch,
    statusFilter,
    priorityFilter,
    reasonFilter,
    targetFilter,
    page,
    pageSize,
  ];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (reasonFilter !== "all") params.set("reason", reasonFilter);
      if (targetFilter !== "all") params.set("targetType", targetFilter);

      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("신고 목록을 불러오지 못했습니다.");
      return (await res.json()) as ReportsResponse;
    },
  });

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: async ({
      reportId,
      action,
      duration,
      reason,
      internalNote,
      notify,
    }: {
      reportId: string;
      action: ActionType;
      duration?: string;
      reason: string;
      internalNote?: string;
      notify: boolean;
    }) => {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          duration: duration ? Number(duration) : undefined,
          reason,
          internalNote: internalNote || undefined,
          notifyUser: notify,
        }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "처리에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedReport(null);
      resetActionPanel();
      toast.success("신고가 처리되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Bulk mutation
  const bulkMutation = useMutation({
    mutationFn: async ({
      reportIds,
      action,
    }: {
      reportIds: string[];
      action: "dismiss" | "escalate";
    }) => {
      const res = await fetch("/api/admin/reports/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds, action }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "일괄 처리에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setSelectedIds(new Set());
      setBulkDialog({ open: false, action: "dismiss" });
      toast.success(
        variables.action === "dismiss"
          ? `${variables.reportIds.length}건을 일괄 기각했습니다.`
          : `${variables.reportIds.length}건을 일괄 에스컬레이션했습니다.`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const stats = data?.stats ?? {
    pending: 0,
    underReview: 0,
    todayResolved: 0,
    escalated: 0,
  };
  const statusCounts = data?.statusCounts ?? {
    all: 0,
    PENDING: 0,
    UNDER_REVIEW: 0,
    ESCALATED: 0,
  };

  const handleRowClick = (report: ReportRow) => {
    setSelectedReport(report);
    resetActionPanel();
  };

  const resetActionPanel = () => {
    setActionType("DISMISS");
    setActionDuration("7");
    setActionReason("");
    setActionNote("");
    setNotifyUser(true);
  };

  // Checkbox helpers
  const allChecked = rows.length > 0 && selectedIds.size === rows.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < rows.length;

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const needsDuration =
    actionType === "TEMP_RESTRICT" || actionType === "TEMP_BAN";

  const handleSubmitAction = () => {
    if (!selectedReport) return;
    if (!actionReason.trim()) {
      toast.error("처리 사유를 입력해주세요.");
      return;
    }
    actionMutation.mutate({
      reportId: selectedReport.id,
      action: actionType,
      duration: needsDuration ? actionDuration : undefined,
      reason: actionReason.trim(),
      internalNote: actionNote.trim() || undefined,
      notify: notifyUser,
    });
  };

  // Filter tabs
  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "전체", count: statusCounts.all },
    { key: "PENDING", label: "접수대기", count: statusCounts.PENDING },
    {
      key: "UNDER_REVIEW",
      label: "검토중",
      count: statusCounts.UNDER_REVIEW,
    },
    { key: "ESCALATED", label: "에스컬레이션", count: statusCounts.ESCALATED },
  ];

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          신고 목록을 불러오지 못했습니다
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ── [A] Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            신고 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            접수된 신고를 검토하고 적절한 조치를 취하세요.
          </p>
        </div>
      </div>

      {/* ── [B] Stats Cards ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {STATS_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} className="bg-card border-border shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("p-2.5 rounded-xl", card.iconBg)}>
                    <Icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats[card.key]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── [C] Filter Tabs + Search + Dropdowns ───────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div
              className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max"
              role="tablist"
            >
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={statusFilter === tab.key}
                  onClick={() => handleStatusChange(tab.key)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    statusFilter === tab.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="콘텐츠 또는 사용자 검색..."
              className="pl-9 bg-card border-border shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] bg-card border-border shadow-sm">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 우선순위</SelectItem>
              <SelectItem value="HIGH">높음</SelectItem>
              <SelectItem value="MEDIUM">보통</SelectItem>
              <SelectItem value="LOW">낮음</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border shadow-sm">
              <SelectValue placeholder="신고유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="SPAM">스팸/홍보</SelectItem>
              <SelectItem value="HARASSMENT">괴롭힘/비방</SelectItem>
              <SelectItem value="INAPPROPRIATE">부적절</SelectItem>
              <SelectItem value="COPYRIGHT">저작권 침해</SelectItem>
              <SelectItem value="OTHER">기타</SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger className="w-[140px] bg-card border-border shadow-sm">
              <SelectValue placeholder="콘텐츠유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 콘텐츠</SelectItem>
              <SelectItem value="POST">게시글</SelectItem>
              <SelectItem value="COMMENT">댓글</SelectItem>
              <SelectItem value="VIDEO">영상</SelectItem>
              <SelectItem value="USER">사용자</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── [D/E] Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Skeleton className="h-4 w-4" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-4">
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-10 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-14" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          {/* Mobile skeleton */}
          <div className="block md:hidden space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── Mobile view ──────────────────────────────────────── */}
          <div className="block md:hidden">
            {rows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted/50 rounded-full">
                    <Flag className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {search
                        ? "검색 결과가 없습니다"
                        : "신고가 없습니다"}
                    </p>
                    <p className="text-sm mt-1">
                      {search
                        ? "다른 검색어를 시도해 보세요."
                        : "새로운 신고가 접수되면 여기에 표시됩니다."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {rows.map((row) => {
                  const TargetIcon = getTargetIcon(row.targetType);
                  return (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "border-none shadow-none text-[10px]",
                              getPriorityBadgeClass(row.priority)
                            )}
                          >
                            {PRIORITY_LABELS[row.priority]}
                          </Badge>
                          <Badge
                            className={cn(
                              "border-none shadow-none text-[10px]",
                              getStatusBadgeClass(row.status)
                            )}
                          >
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          #{row.id.slice(-6)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 mb-2">
                        {row.contentPreview}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <TargetIcon className="h-3 w-3" />
                          <span>{TARGET_LABELS[row.targetType]}</span>
                          <span>·</span>
                          <span>{REASON_LABELS[row.reason]}</span>
                        </div>
                        <span>{formatShortDate(row.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Desktop table ────────────────────────────────────── */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={allChecked}
                          ref={(el) => {
                            if (el) {
                              (
                                el as unknown as HTMLButtonElement
                              ).dataset.state = someChecked
                                ? "indeterminate"
                                : allChecked
                                  ? "checked"
                                  : "unchecked";
                            }
                          }}
                          onCheckedChange={(checked) =>
                            toggleAll(checked === true)
                          }
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-16">
                        우선순위
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-20">
                        ID
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        콘텐츠 미리보기
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        신고유형
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        상태
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-28">
                        날짜
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <Flag className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {search
                                  ? "검색 결과가 없습니다"
                                  : "신고가 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {search
                                  ? "다른 검색어를 시도해 보세요."
                                  : "새로운 신고가 접수되면 여기에 표시됩니다."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const TargetIcon = getTargetIcon(row.targetType);
                        return (
                          <TableRow
                            key={row.id}
                            className="hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => handleRowClick(row)}
                          >
                            {/* Checkbox */}
                            <TableCell
                              className="pl-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedIds.has(row.id)}
                                onCheckedChange={(checked) =>
                                  toggleOne(row.id, checked === true)
                                }
                                aria-label={`신고 ${row.id.slice(-6)} 선택`}
                              />
                            </TableCell>

                            {/* Priority */}
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none shadow-none",
                                  getPriorityBadgeClass(row.priority)
                                )}
                              >
                                {PRIORITY_LABELS[row.priority]}
                              </Badge>
                            </TableCell>

                            {/* ID */}
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              #{row.id.slice(-6)}
                            </TableCell>

                            {/* Content preview */}
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center shrink-0">
                                  <TargetIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <span className="text-sm text-foreground truncate max-w-[300px]">
                                  {row.contentPreview}
                                </span>
                                {row.reportCount > 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="shrink-0 text-[10px] px-1.5"
                                  >
                                    ×{row.reportCount}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Reason */}
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="border-none shadow-none"
                              >
                                {REASON_LABELS[row.reason]}
                              </Badge>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none shadow-none",
                                  getStatusBadgeClass(row.status)
                                )}
                              >
                                {STATUS_LABELS[row.status]}
                              </Badge>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-sm text-muted-foreground">
                              {formatShortDate(row.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {page}
                      </span>{" "}
                      / {totalPages} 페이지
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 px-2 lg:px-3"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 hidden lg:block" />
                        이전
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(totalPages, 5) }).map(
                          (_, i) => {
                            let pNum = page;
                            if (totalPages <= 5) pNum = i + 1;
                            else if (page <= 3) pNum = i + 1;
                            else if (page >= totalPages - 2)
                              pNum = totalPages - 4 + i;
                            else pNum = page - 2 + i;

                            return (
                              <button
                                key={pNum}
                                onClick={() => setPage(pNum)}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                  page === pNum
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {pNum}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className="h-8 px-2 lg:px-3"
                      >
                        다음
                        <ChevronRight className="h-4 w-4 ml-1 hidden lg:block" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── [F] Floating Bulk Action Bar ───────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-2xl px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size}건 선택됨
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkDialog({ open: true, action: "dismiss" })}
              className="border-border"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              일괄 기각
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkDialog({ open: true, action: "escalate" })}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5" />
              일괄 에스컬레이션
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              선택 해제
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── [G] Bulk Action Confirm Dialog ──────────────────────────── */}
      <Dialog
        open={bulkDialog.open}
        onOpenChange={(open) =>
          setBulkDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDialog.action === "dismiss"
                ? `${selectedIds.size}건을 일괄 기각하시겠습니까?`
                : `${selectedIds.size}건을 일괄 에스컬레이션하시겠습니까?`}
            </DialogTitle>
            <DialogDescription>
              {bulkDialog.action === "dismiss"
                ? "선택된 모든 신고가 기각 처리됩니다."
                : "선택된 모든 신고가 에스컬레이션됩니다. 상위 관리자에게 전달됩니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialog({ open: false, action: "dismiss" })}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                bulkMutation.mutate({
                  reportIds: Array.from(selectedIds),
                  action: bulkDialog.action,
                });
              }}
              disabled={bulkMutation.isPending}
              className={
                bulkDialog.action === "dismiss"
                  ? ""
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
            >
              {bulkMutation.isPending
                ? "처리 중..."
                : bulkDialog.action === "dismiss"
                  ? "기각 실행"
                  : "에스컬레이션 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [H] Sheet Detail Panel ─────────────────────────────────── */}
      <Sheet
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 bg-card border-l border-border flex flex-col gap-0 shadow-2xl"
        >
          {selectedReport && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>
                  신고 #{selectedReport.id.slice(-6)} 상세 정보
                </SheetTitle>
                <SheetDescription>
                  신고 상세 정보 및 조치 패널
                </SheetDescription>
              </SheetHeader>

              {/* Header */}
              <div className="relative bg-secondary p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{selectedReport.id.slice(-6)}
                  </span>
                  <Badge
                    className={cn(
                      "border-none shadow-none",
                      getStatusBadgeClass(selectedReport.status)
                    )}
                  >
                    {STATUS_LABELS[selectedReport.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      "border-none shadow-none",
                      getPriorityBadgeClass(selectedReport.priority)
                    )}
                  >
                    우선순위: {PRIORITY_LABELS[selectedReport.priority]}
                  </Badge>
                  <Badge variant="secondary" className="border-none shadow-none">
                    {REASON_LABELS[selectedReport.reason]}
                  </Badge>
                  <Badge variant="secondary" className="border-none shadow-none">
                    {TARGET_LABELS[selectedReport.targetType]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>신고 {selectedReport.reportCount}건</span>
                  <span>·</span>
                  <span>{formatDate(selectedReport.createdAt)}</span>
                </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">
                  {/* Target content preview */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        신고 대상 콘텐츠
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          {(() => {
                            const TargetIcon = getTargetIcon(
                              selectedReport.targetType
                            );
                            return (
                              <TargetIcon className="h-4 w-4 text-muted-foreground" />
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {TARGET_LABELS[selectedReport.targetType]}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                            {selectedReport.contentPreview}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reporter list */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        신고자 목록 ({selectedReport.reporters.length}명)
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {selectedReport.reporters.map((reporter) => (
                        <div
                          key={reporter.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {reporter.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {reporter.email}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatShortDate(reporter.reportedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reported user info */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground">
                        피신고자 정보
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {selectedReport.reportedUser.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedReport.reportedUser.email}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            역할
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {selectedReport.reportedUser.role === "ADMIN"
                              ? "관리자"
                              : "STAR"}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            가입일
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {new Intl.DateTimeFormat("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(
                              new Date(selectedReport.reportedUser.createdAt)
                            )}
                          </p>
                        </div>
                        <div className="bg-amber-500/10 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            경고 횟수
                          </p>
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            {selectedReport.reportedUser.warningCount}회
                          </p>
                        </div>
                        <div className="bg-rose-500/10 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            제재 횟수
                          </p>
                          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                            {selectedReport.reportedUser.sanctionCount}회
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action panel */}
                  {(selectedReport.status === "PENDING" ||
                    selectedReport.status === "UNDER_REVIEW" ||
                    selectedReport.status === "ESCALATED") && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="bg-muted/50 px-5 py-3 border-b border-border">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" />
                          조치 선택
                        </h3>
                      </div>
                      <div className="p-5 space-y-5">
                        {/* Action type radio */}
                        <RadioGroup
                          value={actionType}
                          onValueChange={(v) => setActionType(v as ActionType)}
                          className="grid gap-2"
                        >
                          {(
                            Object.entries(ACTION_LABELS) as [
                              ActionType,
                              string,
                            ][]
                          ).map(([value, label]) => (
                            <div
                              key={value}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border border-border px-4 py-3 cursor-pointer transition-colors",
                                actionType === value
                                  ? "bg-primary/5 border-primary/30"
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => setActionType(value)}
                            >
                              <RadioGroupItem value={value} id={value} />
                              <Label
                                htmlFor={value}
                                className="cursor-pointer flex-1 text-sm"
                              >
                                {label}
                              </Label>
                              {(value === "TEMP_BAN" ||
                                value === "PERM_BAN") && (
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                              )}
                            </div>
                          ))}
                        </RadioGroup>

                        {/* Duration select */}
                        {needsDuration && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              기간 선택
                            </Label>
                            <Select
                              value={actionDuration}
                              onValueChange={setActionDuration}
                            >
                              <SelectTrigger className="w-full bg-card border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            처리 사유 <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            placeholder="처리 사유를 입력하세요..."
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                        </div>

                        {/* Internal note */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            내부 메모 (선택)
                          </Label>
                          <Textarea
                            placeholder="관리자 간 공유할 메모를 입력하세요..."
                            value={actionNote}
                            onChange={(e) => setActionNote(e.target.value)}
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        {/* Notify user */}
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="notify-user"
                            checked={notifyUser}
                            onCheckedChange={(checked) =>
                              setNotifyUser(checked === true)
                            }
                          />
                          <Label
                            htmlFor="notify-user"
                            className="text-sm cursor-pointer"
                          >
                            사용자에게 알림 발송
                          </Label>
                        </div>

                        {/* Submit button */}
                        <Button
                          size="lg"
                          className={cn(
                            "w-full font-bold h-12 rounded-xl active:scale-[0.98] transition-all",
                            actionType === "DISMISS"
                              ? ""
                              : actionType === "PERM_BAN" ||
                                  actionType === "TEMP_BAN"
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : actionType === "WARNING"
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-primary hover:bg-primary/90"
                          )}
                          disabled={
                            actionMutation.isPending || !actionReason.trim()
                          }
                          onClick={handleSubmitAction}
                        >
                          {actionMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              처리 중...
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-4 w-4 mr-2" />
                              {ACTION_LABELS[actionType]} 조치 실행
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
