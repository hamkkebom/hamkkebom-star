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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  ShieldBan,
  ShieldAlert,
  ShieldOff,
  ShieldCheck,
  Eye,
  Plus,
  MoreHorizontal,
  Clock,
  User,
  Loader2,
  Undo2,
  CalendarPlus,
  Gavel,
  History,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SanctionType =
  | "WARNING"
  | "CONTENT_HIDDEN"
  | "CONTENT_REMOVED"
  | "TEMP_RESTRICT"
  | "TEMP_BAN"
  | "PERM_BAN";

type SanctionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

type SanctionRow = {
  id: string;
  type: SanctionType;
  status: SanctionStatus;
  reason: string;
  internalNote?: string | null;
  startDate: string;
  endDate?: string | null;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
    createdAt: string;
  };
  admin: {
    id: string;
    name: string;
  };
  appeal?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    reason: string;
    createdAt: string;
  } | null;
};

type SanctionsResponse = {
  data: SanctionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  typeCounts: {
    all: number;
    WARNING: number;
    TEMP_RESTRICT: number;
    TEMP_BAN: number;
    PERM_BAN: number;
  };
};

type FilterType =
  | "all"
  | "WARNING"
  | "TEMP_RESTRICT"
  | "TEMP_BAN"
  | "PERM_BAN";

// ---------------------------------------------------------------------------
// Label Maps
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<SanctionType, string> = {
  WARNING: "경고",
  CONTENT_HIDDEN: "콘텐츠 숨김",
  CONTENT_REMOVED: "콘텐츠 삭제",
  TEMP_RESTRICT: "임시 제한",
  TEMP_BAN: "임시 정지",
  PERM_BAN: "영구 정지",
};

const STATUS_LABELS: Record<SanctionStatus, string> = {
  ACTIVE: "활성",
  EXPIRED: "만료",
  REVOKED: "해제됨",
};

const APPEAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "검토 대기",
  ACCEPTED: "수락됨",
  REJECTED: "거절됨",
};

const DURATION_OPTIONS = [
  { value: "1", label: "1일" },
  { value: "3", label: "3일" },
  { value: "7", label: "7일" },
  { value: "14", label: "14일" },
  { value: "30", label: "30일" },
  { value: "60", label: "60일" },
  { value: "90", label: "90일" },
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateStr));
}

function getDaysRemaining(endDate: string | null | undefined): string | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff <= 0) return "만료됨";
  return `D-${diff}`;
}

function getTypeBadgeClass(type: SanctionType): string {
  switch (type) {
    case "WARNING":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "CONTENT_HIDDEN":
      return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
    case "CONTENT_REMOVED":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "TEMP_RESTRICT":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "TEMP_BAN":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    case "PERM_BAN":
      return "bg-rose-600/20 text-rose-700 dark:text-rose-300";
  }
}

function getStatusBadgeClass(status: SanctionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    case "EXPIRED":
      return "bg-muted text-muted-foreground";
    case "REVOKED":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  }
}

function getAppealBadgeClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    case "ACCEPTED":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    case "REJECTED":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSanctionsPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedSanction, setSelectedSanction] = useState<SanctionRow | null>(
    null
  );

  // Add sanction dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSanctionUserSearch, setNewSanctionUserSearch] = useState("");
  const [newSanctionUserId, setNewSanctionUserId] = useState("");
  const [newSanctionUserName, setNewSanctionUserName] = useState("");
  const [newSanctionType, setNewSanctionType] =
    useState<SanctionType>("WARNING");
  const [newSanctionDuration, setNewSanctionDuration] = useState("7");
  const [newSanctionReason, setNewSanctionReason] = useState("");
  const [newSanctionNote, setNewSanctionNote] = useState("");
  const [newSanctionNotify, setNewSanctionNotify] = useState(true);

  // Revoke dialog
  const [revokeDialog, setRevokeDialog] = useState<{
    open: boolean;
    sanctionId: string;
    userName: string;
  }>({ open: false, sanctionId: "", userName: "" });
  const [revokeReason, setRevokeReason] = useState("");

  // Search debounce (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter change handler
  const handleTypeChange = useCallback(
    (newFilter: FilterType) => {
      if (newFilter === typeFilter) return;
      setTypeFilter(newFilter);
      setPage(1);
    },
    [typeFilter]
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const queryKey = [
    "admin-sanctions",
    debouncedSearch,
    typeFilter,
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
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/admin/sanctions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("제재 목록을 불러오지 못했습니다.");
      return (await res.json()) as SanctionsResponse;
    },
  });

  // User search for add dialog
  const { data: userSearchResults } = useQuery({
    queryKey: ["admin-user-search", newSanctionUserSearch],
    queryFn: async () => {
      if (!newSanctionUserSearch || newSanctionUserSearch.length < 2)
        return { data: [] };
      const params = new URLSearchParams({
        search: newSanctionUserSearch,
        pageSize: "5",
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return { data: [] };
      return (await res.json()) as {
        data: { id: string; name: string; email: string }[];
      };
    },
    enabled: addDialogOpen && newSanctionUserSearch.length >= 2,
  });

  // Sanction history for detail sheet
  const { data: sanctionHistory } = useQuery({
    queryKey: [
      "admin-sanction-history",
      selectedSanction?.user.id,
    ],
    queryFn: async () => {
      if (!selectedSanction) return { data: [] };
      const params = new URLSearchParams({
        userId: selectedSanction.user.id,
        pageSize: "50",
      });
      const res = await fetch(`/api/admin/sanctions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return { data: [] };
      return (await res.json()) as { data: SanctionRow[] };
    },
    enabled: !!selectedSanction,
  });

  // Create sanction mutation
  const createMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      type: SanctionType;
      duration?: number;
      reason: string;
      internalNote?: string;
      notifyUser: boolean;
    }) => {
      const res = await fetch("/api/admin/sanctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "제재 추가에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sanctions"] });
      resetAddDialog();
      toast.success("제재가 추가되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Revoke sanction mutation
  const revokeMutation = useMutation({
    mutationFn: async ({
      sanctionId,
      reason,
    }: {
      sanctionId: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/admin/sanctions/${sanctionId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "제재 해제에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sanctions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sanction-history"] });
      setRevokeDialog({ open: false, sanctionId: "", userName: "" });
      setRevokeReason("");
      setSelectedSanction(null);
      toast.success("제재가 해제되었습니다.");
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
  const typeCounts = data?.typeCounts ?? {
    all: 0,
    WARNING: 0,
    TEMP_RESTRICT: 0,
    TEMP_BAN: 0,
    PERM_BAN: 0,
  };

  const handleRowClick = (sanction: SanctionRow) => {
    setSelectedSanction(sanction);
  };

  const resetAddDialog = () => {
    setAddDialogOpen(false);
    setNewSanctionUserSearch("");
    setNewSanctionUserId("");
    setNewSanctionUserName("");
    setNewSanctionType("WARNING");
    setNewSanctionDuration("7");
    setNewSanctionReason("");
    setNewSanctionNote("");
    setNewSanctionNotify(true);
  };

  const handleCreateSanction = () => {
    if (!newSanctionUserId) {
      toast.error("사용자를 선택해주세요.");
      return;
    }
    if (!newSanctionReason.trim()) {
      toast.error("사유를 입력해주세요.");
      return;
    }
    const needsDuration =
      newSanctionType === "TEMP_RESTRICT" || newSanctionType === "TEMP_BAN";
    createMutation.mutate({
      userId: newSanctionUserId,
      type: newSanctionType,
      duration: needsDuration ? Number(newSanctionDuration) : undefined,
      reason: newSanctionReason.trim(),
      internalNote: newSanctionNote.trim() || undefined,
      notifyUser: newSanctionNotify,
    });
  };

  // Filter tabs
  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "전체", count: typeCounts.all },
    { key: "WARNING", label: "경고", count: typeCounts.WARNING },
    {
      key: "TEMP_RESTRICT",
      label: "임시제한",
      count: typeCounts.TEMP_RESTRICT,
    },
    { key: "TEMP_BAN", label: "임시정지", count: typeCounts.TEMP_BAN },
    { key: "PERM_BAN", label: "영구정지", count: typeCounts.PERM_BAN },
  ];

  const newSanctionNeedsDuration =
    newSanctionType === "TEMP_RESTRICT" || newSanctionType === "TEMP_BAN";

  const historyRows = sanctionHistory?.data ?? [];

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          제재 목록을 불러오지 못했습니다
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
            제재 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            사용자 제재 이력을 관리하고 새로운 제재를 추가하세요.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          수동 제재 추가
        </Button>
      </div>

      {/* ── [B] Filter Tabs + Search ───────────────────────────────── */}
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
                aria-selected={typeFilter === tab.key}
                onClick={() => handleTypeChange(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  typeFilter === tab.key
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
            placeholder="사용자 이름 또는 이메일 검색..."
            className="pl-9 bg-card border-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── [C/D] Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <>
          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <Card className="bg-card border-border shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-6" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-3 w-28" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 rounded-md" />
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
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
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
                    <ShieldBan className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {search
                        ? "검색 결과가 없습니다"
                        : "제재 이력이 없습니다"}
                    </p>
                    <p className="text-sm mt-1">
                      {search
                        ? "다른 검색어를 시도해 보세요."
                        : "제재가 추가되면 여기에 표시됩니다."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {rows.map((row) => {
                  const daysRemaining = getDaysRemaining(row.endDate);
                  return (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="bg-card border border-border rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={row.user.avatarUrl || ""} />
                          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                            {row.user.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {row.user.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {row.user.email}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "border-none shadow-none text-[10px] shrink-0",
                            getTypeBadgeClass(row.type)
                          )}
                        >
                          {TYPE_LABELS[row.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {row.reason}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatShortDate(row.startDate)}</span>
                        {daysRemaining && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5"
                          >
                            {daysRemaining}
                          </Badge>
                        )}
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
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        사용자
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        제재 유형
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        사유
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-24">
                        시작일
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-28">
                        종료일
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground w-20">
                        처리자
                      </TableHead>
                      <TableHead className="w-10 font-semibold text-xs text-muted-foreground">
                        <span className="sr-only">액션</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <ShieldBan className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {search
                                  ? "검색 결과가 없습니다"
                                  : "제재 이력이 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {search
                                  ? "다른 검색어를 시도해 보세요."
                                  : "제재가 추가되면 여기에 표시됩니다."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const daysRemaining = getDaysRemaining(row.endDate);
                        return (
                          <TableRow
                            key={row.id}
                            className="hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => handleRowClick(row)}
                          >
                            {/* User */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 border border-border">
                                  <AvatarImage
                                    src={row.user.avatarUrl || ""}
                                  />
                                  <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                    {row.user.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-sm text-foreground truncate">
                                    {row.user.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {row.user.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Type */}
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-none shadow-none",
                                  getTypeBadgeClass(row.type)
                                )}
                              >
                                {TYPE_LABELS[row.type]}
                              </Badge>
                            </TableCell>

                            {/* Reason */}
                            <TableCell>
                              <span className="text-sm text-foreground truncate max-w-[250px] block">
                                {row.reason}
                              </span>
                            </TableCell>

                            {/* Start date */}
                            <TableCell className="text-sm text-muted-foreground">
                              {formatShortDate(row.startDate)}
                            </TableCell>

                            {/* End date */}
                            <TableCell>
                              {row.endDate ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {formatShortDate(row.endDate)}
                                  </span>
                                  {daysRemaining &&
                                    row.status === "ACTIVE" && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1.5"
                                      >
                                        {daysRemaining}
                                      </Badge>
                                    )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {row.type === "PERM_BAN" ? "무기한" : "—"}
                                </span>
                              )}
                            </TableCell>

                            {/* Admin */}
                            <TableCell className="text-sm text-muted-foreground">
                              {row.admin.name}
                            </TableCell>

                            {/* Action dropdown */}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">메뉴 열기</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleRowClick(row)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    상세 보기
                                  </DropdownMenuItem>
                                  {row.status === "ACTIVE" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setRevokeDialog({
                                            open: true,
                                            sanctionId: row.id,
                                            userName: row.user.name,
                                          });
                                          setRevokeReason("");
                                        }}
                                      >
                                        <Undo2 className="h-4 w-4 mr-2 text-emerald-600" />
                                        조기 해제
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* ── [E] Add Sanction Dialog ────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => !open && resetAddDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              수동 제재 추가
            </DialogTitle>
            <DialogDescription>
              사용자를 검색하고 제재 유형과 사유를 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* User search */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                사용자 검색 <span className="text-destructive">*</span>
              </Label>
              {newSanctionUserId ? (
                <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {newSanctionUserName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewSanctionUserId("");
                      setNewSanctionUserName("");
                      setNewSanctionUserSearch("");
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    변경
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={newSanctionUserSearch}
                    onChange={(e) => setNewSanctionUserSearch(e.target.value)}
                    className="bg-card border-border"
                  />
                  {userSearchResults &&
                    userSearchResults.data.length > 0 && (
                      <div className="border border-border rounded-xl overflow-hidden bg-card">
                        {userSearchResults.data.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setNewSanctionUserId(u.id);
                              setNewSanctionUserName(u.name);
                              setNewSanctionUserSearch("");
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                          >
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {u.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {u.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Sanction type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                제재 유형 <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={newSanctionType}
                onValueChange={(v) => setNewSanctionType(v as SanctionType)}
                className="grid gap-2"
              >
                {(
                  Object.entries(TYPE_LABELS) as [SanctionType, string][]
                ).map(([value, label]) => (
                  <div
                    key={value}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border px-4 py-2.5 cursor-pointer transition-colors",
                      newSanctionType === value
                        ? "bg-primary/5 border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setNewSanctionType(value)}
                  >
                    <RadioGroupItem value={value} id={`new-${value}`} />
                    <Label
                      htmlFor={`new-${value}`}
                      className="cursor-pointer flex-1 text-sm"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Duration */}
            {newSanctionNeedsDuration && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  기간
                </Label>
                <Select
                  value={newSanctionDuration}
                  onValueChange={setNewSanctionDuration}
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
                사유 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="제재 사유를 입력하세요..."
                value={newSanctionReason}
                onChange={(e) => setNewSanctionReason(e.target.value)}
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
                placeholder="관리자 간 공유할 메모..."
                value={newSanctionNote}
                onChange={(e) => setNewSanctionNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Notify */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="new-notify"
                checked={newSanctionNotify}
                onCheckedChange={(checked) =>
                  setNewSanctionNotify(checked === true)
                }
              />
              <Label htmlFor="new-notify" className="text-sm cursor-pointer">
                사용자에게 알림 발송
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetAddDialog}>
              취소
            </Button>
            <Button
              onClick={handleCreateSanction}
              disabled={
                createMutation.isPending ||
                !newSanctionUserId ||
                !newSanctionReason.trim()
              }
              className={cn(
                newSanctionType === "PERM_BAN" || newSanctionType === "TEMP_BAN"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : ""
              )}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                "제재 추가"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [F] Revoke Confirmation Dialog ──────────────────────────── */}
      <AlertDialog
        open={revokeDialog.open}
        onOpenChange={(open) =>
          setRevokeDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {revokeDialog.userName}님의 제재를 해제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 해당 제재를 즉시 해제합니다. 해제 사유를 입력해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-medium text-muted-foreground">
              해제 사유 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="해제 사유를 입력하세요..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setRevokeDialog({ open: false, sanctionId: "", userName: "" })
              }
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!revokeReason.trim()) {
                  toast.error("해제 사유를 입력해주세요.");
                  return;
                }
                revokeMutation.mutate({
                  sanctionId: revokeDialog.sanctionId,
                  reason: revokeReason.trim(),
                });
              }}
              disabled={revokeMutation.isPending || !revokeReason.trim()}
              variant="default"
            >
              {revokeMutation.isPending ? "처리 중..." : "제재 해제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── [G] Sheet Detail Panel ─────────────────────────────────── */}
      <Sheet
        open={!!selectedSanction}
        onOpenChange={(open) => !open && setSelectedSanction(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 bg-card border-l border-border flex flex-col gap-0 shadow-2xl"
        >
          {selectedSanction && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>
                  {selectedSanction.user.name} 제재 상세 정보
                </SheetTitle>
                <SheetDescription>
                  제재 상세 정보 및 이력
                </SheetDescription>
              </SheetHeader>

              {/* Header */}
              <div className="relative bg-secondary p-6 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12 border-2 border-card shadow-lg">
                    <AvatarImage
                      src={selectedSanction.user.avatarUrl || ""}
                    />
                    <AvatarFallback className="text-sm font-bold bg-muted text-muted-foreground">
                      {selectedSanction.user.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">
                      {selectedSanction.user.name}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedSanction.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      "border-none shadow-none",
                      getTypeBadgeClass(selectedSanction.type)
                    )}
                  >
                    {TYPE_LABELS[selectedSanction.type]}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-none shadow-none",
                      getStatusBadgeClass(selectedSanction.status)
                    )}
                  >
                    {STATUS_LABELS[selectedSanction.status]}
                  </Badge>
                </div>
              </div>

              {/* Scrollable Content */}
              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">
                  {/* Current sanction info */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        현재 제재 정보
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            시작일
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {formatDate(selectedSanction.startDate)}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-0.5">
                            종료일
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {selectedSanction.endDate
                              ? formatDate(selectedSanction.endDate)
                              : selectedSanction.type === "PERM_BAN"
                                ? "무기한"
                                : "—"}
                          </p>
                        </div>
                      </div>
                      {selectedSanction.endDate &&
                        selectedSanction.status === "ACTIVE" && (
                          <div className="bg-amber-500/10 rounded-xl p-3 text-center">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                              {getDaysRemaining(selectedSanction.endDate) ??
                                "—"}
                            </p>
                          </div>
                        )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          사유
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedSanction.reason}
                        </p>
                      </div>
                      {selectedSanction.internalNote && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            내부 메모
                          </p>
                          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
                            {selectedSanction.internalNote}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <Gavel className="h-3 w-3" />
                        <span>처리자: {selectedSanction.admin.name}</span>
                      </div>
                      {selectedSanction.revokedAt && (
                        <div className="bg-emerald-500/10 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            해제됨 — {formatDate(selectedSanction.revokedAt)}
                          </p>
                          {selectedSanction.revokeReason && (
                            <p className="text-xs text-muted-foreground">
                              사유: {selectedSanction.revokeReason}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appeal status */}
                  {selectedSanction.appeal && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="bg-muted/50 px-5 py-3 border-b border-border">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          이의 신청
                        </h3>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={cn(
                              "border-none shadow-none",
                              getAppealBadgeClass(
                                selectedSanction.appeal.status
                              )
                            )}
                          >
                            {APPEAL_STATUS_LABELS[
                              selectedSanction.appeal.status
                            ] ?? selectedSanction.appeal.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatShortDate(
                              selectedSanction.appeal.createdAt
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedSanction.appeal.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sanction timeline */}
                  <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-muted/50 px-5 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <History className="h-4 w-4" />
                        제재 이력 ({historyRows.length}건)
                      </h3>
                    </div>
                    <div className="p-5">
                      {historyRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          제재 이력이 없습니다.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {historyRows.map((item) => (
                            <div
                              key={item.id}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border border-border p-3 transition-colors",
                                item.id === selectedSanction.id
                                  ? "bg-primary/5 border-primary/30"
                                  : ""
                              )}
                            >
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                  item.status === "ACTIVE"
                                    ? "bg-rose-500"
                                    : item.status === "REVOKED"
                                      ? "bg-emerald-500"
                                      : "bg-muted-foreground"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <Badge
                                    className={cn(
                                      "border-none shadow-none text-[10px]",
                                      getTypeBadgeClass(item.type)
                                    )}
                                  >
                                    {TYPE_LABELS[item.type]}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {formatShortDate(item.startDate)}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {item.reason}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  {selectedSanction.status === "ACTIVE" && (
                    <div className="space-y-3 pt-2 pb-4">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full font-bold h-12 rounded-xl active:scale-[0.98] transition-all border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => {
                          setRevokeDialog({
                            open: true,
                            sanctionId: selectedSanction.id,
                            userName: selectedSanction.user.name,
                          });
                          setRevokeReason("");
                        }}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        조기 해제
                      </Button>
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
