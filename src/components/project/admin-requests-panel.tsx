"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  FileText,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequestForm } from "@/components/project/request-form";
import type { CreateRequestInput } from "@/lib/validations/project-request";

// ─── Types ───────────────────────────────────────────────────

type RequestStatus = "OPEN" | "FULL" | "CLOSED" | "CANCELLED";
type AssignmentType = "SINGLE" | "MULTIPLE";
type ViewMode = "table" | "card";

type AdminRequestRow = {
  id: string;
  title: string;
  categories: string[];
  deadline: string;
  assignmentType: AssignmentType;
  maxAssignees: number;
  estimatedBudget: string | number | null;
  requirements: string | null;
  referenceUrls: string[];
  status: RequestStatus;
  currentAssignees: number;
  pendingApprovals?: number;
};

type RequestBoardResponse = {
  data: AdminRequestRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
};

type AssignmentStatus =
  | "PENDING_APPROVAL"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

type DetailAssignment = {
  id: string;
  status: AssignmentStatus;
  starId: string;
  requestId: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  star: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  reviewedBy: { id: string; name: string } | null;
  _count: { submissions: number };
};

type ProjectDetail = {
  id: string;
  title: string;
  categories: string[];
  deadline: string;
  assignmentType: AssignmentType;
  maxAssignees: number;
  estimatedBudget: string | number | null;
  requirements: string | null;
  referenceUrls: string[];
  status: RequestStatus;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  assignments: DetailAssignment[];
  currentAssignees: number;
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

// ─── Constants ───────────────────────────────────────────────

const STATUS_CONFIG: Record<RequestStatus, { label: string; pillClass: string }> = {
  OPEN: {
    label: "모집중",
    pillClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  },
  FULL: {
    label: "정원마감",
    pillClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  CLOSED: {
    label: "종료",
    pillClass: "bg-muted text-muted-foreground border border-border",
  },
  CANCELLED: {
    label: "취소",
    pillClass: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "OPEN", label: "모집중" },
  { value: "FULL", label: "정원마감" },
  { value: "CLOSED", label: "종료" },
  { value: "CANCELLED", label: "취소" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "created", label: "최신순" },
  { value: "deadline", label: "마감일순" },
  { value: "budget", label: "예산순" },
  { value: "title", label: "제목순" },
];

const ASSIGNMENT_STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; pillClass: string }
> = {
  PENDING_APPROVAL: {
    label: "승인대기",
    pillClass: "bg-amber-500/15 text-amber-400",
  },
  ACCEPTED: {
    label: "수락",
    pillClass: "bg-emerald-500/15 text-emerald-400",
  },
  IN_PROGRESS: {
    label: "진행중",
    pillClass: "bg-blue-500/15 text-blue-400",
  },
  SUBMITTED: {
    label: "제출완료",
    pillClass: "bg-violet-500/15 text-violet-400",
  },
  COMPLETED: {
    label: "완료",
    pillClass: "bg-emerald-500/15 text-emerald-400",
  },
  CANCELLED: {
    label: "취소",
    pillClass: "bg-muted text-muted-foreground",
  },
  REJECTED: {
    label: "반려",
    pillClass: "bg-red-500/15 text-red-400",
  },
};

const VIEW_STORAGE_KEY = "admin-requests-view";
const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatBudget(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "미정";
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "미정";
  return `${new Intl.NumberFormat("ko-KR").format(num)}원`;
}

function getDaysLeft(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getDdayLabel(deadline: string): { text: string; className: string } {
  const days = getDaysLeft(deadline);
  if (days < 0) return { text: "마감", className: "bg-red-500/15 text-red-400" };
  if (days === 0) return { text: "D-Day", className: "bg-red-500/15 text-red-400" };
  if (days <= 7) return { text: `D-${days}`, className: "bg-amber-500/15 text-amber-400" };
  return { text: `D-${days}`, className: "bg-emerald-500/15 text-emerald-400" };
}

function getUrgencyBorder(status: RequestStatus, deadline: string): string {
  if (status === "CLOSED" || status === "CANCELLED") return "border-l-muted-foreground/30";
  const days = getDaysLeft(deadline);
  if (days < 0) return "border-l-red-500";
  if (days <= 7) return "border-l-amber-500";
  return "border-l-emerald-500";
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiError;
    return payload.error?.message ?? "요청 처리에 실패했습니다.";
  } catch {
    return "요청 처리에 실패했습니다.";
  }
}

// ─── Sub-Components ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  pillClass,
  isLoading: loading,
}: {
  icon: typeof FolderKanban;
  label: string;
  value: number;
  pillClass: string;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 backdrop-blur-sm">
      <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", pillClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-6 w-10 mb-0.5" />
        ) : (
          <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: RequestStatus }) {
  const config = STATUS_CONFIG[status];
  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.pillClass)}>
      {config.label}
    </span>
  );
}

function ProgressBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {current}/{max}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={`tsk-${i}`} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={`csk-${i}`} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FolderKanban className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">
        등록된 프로젝트가 없습니다
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        새로운 프로젝트를 생성하여 시작하세요.
      </p>
    </div>
  );
}

// ─── Card View Component ─────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function RequestCard({
  row,
  index,
  onEdit,
  onDelete,
  onClick,
}: {
  row: AdminRequestRow;
  index: number;
  onEdit: (row: AdminRequestRow) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}) {
  const dday = getDdayLabel(row.deadline);
  const urgencyBorder = getUrgencyBorder(row.status, row.deadline);
  const pct = row.maxAssignees > 0 ? Math.min(100, Math.round((row.currentAssignees / row.maxAssignees) * 100)) : 0;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-l-[3px] bg-card p-5 cursor-pointer",
        "transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        urgencyBorder,
      )}
      onClick={() => onClick?.(row.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
          {row.title}
        </h3>
        <StatusPill status={row.status} />
      </div>

      {/* Budget */}
      <p className="text-lg font-bold tracking-tight mb-3">
        {formatBudget(row.estimatedBudget)}
      </p>

      {/* Deadline + D-Day */}
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <span>{formatDate(row.deadline)}</span>
        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", dday.className)}>
          {dday.text}
        </span>
      </div>

      {/* Slots progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {row.currentAssignees}/{row.maxAssignees}명 참여
          </span>
          <span className="text-muted-foreground tabular-nums">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      {row.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {row.categories.slice(0, 3).map((cat) => (
            <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
              {cat}
            </Badge>
          ))}
          {row.categories.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{row.categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        {row.pendingApprovals && row.pendingApprovals > 0 ? (
          <Badge variant="outline" className="gap-1 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
            <ShieldAlert className="h-3 w-3" />
            승인 대기 {row.pendingApprovals}
          </Badge>
        ) : (
          <div />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClick?.(row.id)}>
              <Eye className="h-3.5 w-3.5 mr-2" />
              상세 보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function AdminRequestsPanel() {
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("created");
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || "table";
    }
    return "table";
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<AdminRequestRow | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Debounce search (350ms)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  // Persist view mode
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }, []);

  // Data fetching
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-project-requests", { page, pageSize: PAGE_SIZE, status, search: debouncedSearch, sort }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        counts: "true",
        pendingApprovals: "true",
        sort,
        ...(status !== "ALL" ? { status } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const response = await fetch(`/api/projects/requests/board?${params}`, { cache: "no-store" });
      const text = await response.text();
      if (!text) throw new Error("서버에서 빈 응답을 반환했습니다.");
      let payload: RequestBoardResponse | ApiError;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("서버 응답을 파싱할 수 없습니다.");
      }
      if (!response.ok) {
        const message = "error" in payload ? (payload as ApiError).error.message : "요청 목록을 불러오지 못했습니다.";
        throw new Error(message);
      }
      return payload as RequestBoardResponse;
    },
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;
  const statusCounts = data?.statusCounts;

  // KPI values
  const kpiTotal = statusCounts
    ? (statusCounts.OPEN ?? 0) + (statusCounts.FULL ?? 0) + (statusCounts.CLOSED ?? 0) + (statusCounts.CANCELLED ?? 0)
    : 0;
  const kpiOpen = statusCounts?.OPEN ?? 0;
  const kpiFull = statusCounts?.FULL ?? 0;
  const kpiPending = statusCounts?.PENDING_APPROVAL ?? 0;

  // ─── Mutations ───────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: CreateRequestInput) => {
      const response = await fetch("/api/projects/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("프로젝트가 생성되었습니다.");
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "프로젝트 생성에 실패했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateRequestInput }) => {
      const response = await fetch(`/api/projects/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("프로젝트가 수정되었습니다.");
      setEditingRequest(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "프로젝트 수정에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/requests/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("프로젝트가 삭제되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "프로젝트 삭제에 실패했습니다.");
    },
  });

  // ─── Detail Query ─────────────────────────────────────────

  const {
    data: detailData,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ["admin-project-detail", selectedProjectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/requests/${selectedProjectId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
      const payload = (await response.json()) as { data: ProjectDetail };
      return payload.data;
    },
    enabled: !!selectedProjectId,
  });

  const approveMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/projects/assignments/${assignmentId}/approve`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("참여가 승인되었습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-project-detail", selectedProjectId] }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "승인 처리에 실패했습니다.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/projects/assignments/${assignmentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }
    },
    onSuccess: async () => {
      toast.success("참여가 반려되었습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-project-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-project-detail", selectedProjectId] }),
      ]);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "반려 처리에 실패했습니다.");
    },
  });

  const handleDelete = useCallback(
    (id: string) => {
      const confirmed = window.confirm("정말 이 프로젝트를 삭제하시겠습니까?");
      if (confirmed) deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleEdit = useCallback((row: AdminRequestRow) => {
    setEditingRequest(row);
  }, []);

  // ─── Pagination range ────────────────────────────────────

  const startItem = (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">프로젝트 관리</h1>
          <p className="text-sm text-muted-foreground">제작 요청을 생성하고 상태를 관리합니다.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          프로젝트 생성
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={FolderKanban}
          label="전체 프로젝트"
          value={kpiTotal}
          pillClass="bg-primary/15 text-primary"
          isLoading={isLoading}
        />
        <KpiCard
          icon={CircleDot}
          label="모집중"
          value={kpiOpen}
          pillClass="bg-emerald-500/15 text-emerald-400"
          isLoading={isLoading}
        />
        <KpiCard
          icon={UserCheck}
          label="정원마감"
          value={kpiFull}
          pillClass="bg-amber-500/15 text-amber-400"
          isLoading={isLoading}
        />
        <KpiCard
          icon={ShieldAlert}
          label="승인 대기"
          value={kpiPending}
          pillClass="bg-red-500/15 text-red-400"
          isLoading={isLoading}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={cn(
                "relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap select-none",
                status === f.value
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {status === f.value && (
                <motion.div
                  layoutId="adminRequestFilter"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">
                {f.label}
                {statusCounts && f.value !== "ALL" && (
                  <span className="ml-1 tabular-nums opacity-80">
                    {statusCounts[f.value] ?? 0}
                  </span>
                )}
                {statusCounts && f.value === "ALL" && (
                  <span className="ml-1 tabular-nums opacity-80">
                    {kpiTotal}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="프로젝트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Sort */}
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => handleViewChange("table")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "table"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="테이블 보기"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleViewChange("card")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              view === "card"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="카드 보기"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        view === "table" ? <TableSkeleton /> : <CardSkeleton />
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "요청 목록을 불러오지 못했습니다."}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="wait">
          {view === "table" ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">제목</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>마감일</TableHead>
                      <TableHead>인원</TableHead>
                      <TableHead>예산</TableHead>
                      <TableHead>승인대기</TableHead>
                      <TableHead className="text-right w-[80px]">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedProjectId(row.id)}
                      >
                        <TableCell className="max-w-[280px] truncate font-medium">
                          {row.title}
                        </TableCell>
                        <TableCell>
                          <StatusPill status={row.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {cat}
                              </Badge>
                            ))}
                            {row.categories.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{row.categories.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(row.deadline)}
                        </TableCell>
                        <TableCell>
                          <ProgressBar current={row.currentAssignees} max={row.maxAssignees} />
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap tabular-nums">
                          {formatBudget(row.estimatedBudget)}
                        </TableCell>
                        <TableCell>
                          {row.pendingApprovals && row.pendingApprovals > 0 ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                              {row.pendingApprovals}건
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedProjectId(row.id)}>
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(row)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                수정
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(row.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Fallback for Table View */}
              <div className="block md:hidden space-y-3">
                {rows.map((row, i) => (
                  <RequestCard key={row.id} row={row} index={i} onEdit={handleEdit} onDelete={handleDelete} onClick={setSelectedProjectId} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rows.map((row, i) => (
                  <RequestCard key={row.id} row={row} index={i} onEdit={handleEdit} onDelete={handleDelete} onClick={setSelectedProjectId} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!isLoading && rows.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {total}개 중 {startItem}-{endItem}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ResponsiveModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="새 프로젝트 생성"
        description="필수 정보를 입력한 뒤 프로젝트를 생성하세요."
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      >
        <RequestForm
          submitLabel="프로젝트 생성"
          onSubmit={async (payload) => {
            await createMutation.mutateAsync(payload);
          }}
        />
      </ResponsiveModal>

      {/* Edit Modal */}
      <ResponsiveModal
        open={Boolean(editingRequest)}
        onOpenChange={(open: boolean) => !open && setEditingRequest(null)}
        title="프로젝트 수정"
        description="내용을 수정한 뒤 저장하세요."
        className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      >
        {editingRequest ? (
          <RequestForm
            submitLabel="변경사항 저장"
            initialValues={{
              title: editingRequest.title,
              categories: editingRequest.categories,
              deadline: editingRequest.deadline,
              assignmentType: editingRequest.assignmentType,
              maxAssignees: editingRequest.maxAssignees,
              estimatedBudget:
                editingRequest.estimatedBudget === null
                  ? undefined
                  : Number(editingRequest.estimatedBudget),
              requirements: editingRequest.requirements ?? undefined,
              referenceUrls: editingRequest.referenceUrls,
            }}
            onSubmit={async (payload) => {
              await updateMutation.mutateAsync({ id: editingRequest.id, payload });
            }}
          />
        ) : null}
      </ResponsiveModal>

      {/* Project Detail Sheet */}
      <Sheet
        open={!!selectedProjectId}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col gap-0 p-0 w-full max-w-[550px] overflow-y-auto"
        >
          {/* Header */}
          <SheetHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-black">프로젝트 상세</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedProjectId(null)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isDetailLoading ? (
              /* Loading skeleton */
              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-7 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={`dsk-${i}`} className="h-16 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            ) : detailData ? (
              <>
                {/* Project Info Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-black leading-tight flex-1">
                      {detailData.title}
                    </h2>
                    <StatusPill status={detailData.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      <span className="font-medium">{formatDate(detailData.deadline)}</span>
                    </div>
                    {(() => {
                      const dday = getDdayLabel(detailData.deadline);
                      return (
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold", dday.className)}>
                          {dday.text}
                        </span>
                      );
                    })()}
                    <span className="text-xs tabular-nums">
                      {formatBudget(detailData.estimatedBudget)}
                    </span>
                  </div>

                  {detailData.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {detailData.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignment Summary Bar */}
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-bold tabular-nums">
                      {detailData.currentAssignees}/{detailData.maxAssignees}명
                    </span>
                    <span className="text-muted-foreground"> 참여 중</span>
                    {(() => {
                      const pendingCount = detailData.assignments.filter(
                        (a) => a.status === "PENDING_APPROVAL",
                      ).length;
                      return pendingCount > 0 ? (
                        <span className="text-amber-400 ml-1.5">
                          · 승인대기 {pendingCount}건
                        </span>
                      ) : null;
                    })()}
                  </p>
                </div>

                {/* Requirements */}
                {detailData.requirements && (
                  <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold">요구사항</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                        {detailData.requirements}
                      </p>
                    </div>
                  </div>
                )}

                {/* Star Assignment List */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">참여 스타 목록</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ({detailData.assignments.length})
                    </span>
                  </div>

                  {detailData.assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-xl bg-muted/10">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        아직 참여한 스타가 없습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailData.assignments.map((assignment) => {
                        const statusConf =
                          ASSIGNMENT_STATUS_CONFIG[assignment.status] ?? {
                            label: assignment.status,
                            pillClass: "bg-muted text-muted-foreground",
                          };
                        const isPending = assignment.status === "PENDING_APPROVAL";
                        const isMutating =
                          approveMutation.isPending || rejectMutation.isPending;

                        return (
                          <div
                            key={assignment.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors",
                              isPending && "border-amber-500/30 bg-amber-500/5",
                            )}
                          >
                            {/* Avatar */}
                            <Avatar>
                              {assignment.star.avatarUrl ? (
                                <AvatarImage
                                  src={assignment.star.avatarUrl}
                                  alt={assignment.star.name}
                                />
                              ) : null}
                              <AvatarFallback>
                                {assignment.star.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold truncate">
                                  {assignment.star.name}
                                </p>
                                {assignment.star.chineseName && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    ({assignment.star.chineseName})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {assignment.star.email}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {formatDate(assignment.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Status + Submission Count */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  statusConf.pillClass,
                                )}
                              >
                                {assignment.status === "COMPLETED" && (
                                  <Check className="h-3 w-3" />
                                )}
                                {statusConf.label}
                              </span>
                              {assignment._count.submissions > 0 && (
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                  제출 {assignment._count.submissions}건
                                </span>
                              )}
                            </div>

                            {/* Quick Actions for PENDING_APPROVAL */}
                            {isPending && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                                  disabled={isMutating}
                                  onClick={() => approveMutation.mutate(assignment.id)}
                                  aria-label="승인"
                                >
                                  {approveMutation.isPending &&
                                  approveMutation.variables === assignment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                  disabled={isMutating}
                                  onClick={() => rejectMutation.mutate(assignment.id)}
                                  aria-label="반려"
                                >
                                  {rejectMutation.isPending &&
                                  rejectMutation.variables === assignment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
