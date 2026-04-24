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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CreditCard,
  ShieldCheck,
  Eye,
  EyeOff,
  Building,
  Download,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  Shield,
  Star,
  Clock,
  Pencil,
  Check,
  X,
  Send,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { maskIdNumber } from "@/lib/settlement-utils";
import { cn } from "@/lib/utils";
import {
  UserSwipeDeck,
  SwipeableUser,
} from "@/components/admin/user-swipe-deck";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserRow = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isApproved: boolean;
  createdAt: string;
  idNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  avatarUrl?: string | null;
  canDirectUpload: boolean;
  showVideosPublicly: boolean;
};

type UsersResponse = {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total: number;
    adminCount: number;
    starCount: number;
    pendingCount: number;
    approvedCount: number;
  };
};

type FilterType = "all" | "ADMIN" | "STAR" | "pending" | "approved";

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

function exportToCSV(rows: UserRow[]) {
  const headers = ["이름", "이메일", "역할", "상태", "가입일"];
  const csvRows = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.email,
        r.role === "ADMIN" ? "관리자" : "STAR",
        r.isApproved ? "승인됨" : "대기중",
        formatDate(r.createdAt),
      ]
        .map((v) => `"${v}"`)
        .join(",")
    ),
  ];
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `사용자목록_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Stats cards config
// ---------------------------------------------------------------------------

const STATS_CARDS = [
  {
    key: "total" as const,
    label: "전체 사용자",
    icon: Users,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "adminCount" as const,
    label: "관리자",
    icon: Shield,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "starCount" as const,
    label: "STAR",
    icon: Star,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "pendingCount" as const,
    label: "승인 대기",
    icon: Clock,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

// ---------------------------------------------------------------------------
// Filter tabs config
// ---------------------------------------------------------------------------

function getFilterTabs(stats: UsersResponse["stats"]) {
  return [
    { key: "all" as FilterType, label: "전체", count: stats.total },
    { key: "ADMIN" as FilterType, label: "관리자", count: stats.adminCount },
    { key: "STAR" as FilterType, label: "STAR", count: stats.starCount },
    { key: "pending" as FilterType, label: "대기중", count: stats.pendingCount },
    {
      key: "approved" as FilterType,
      label: "승인됨",
      count: stats.approvedCount,
    },
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  // State
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // Bulk action dialog
  const [bulkDialog, setBulkDialog] = useState<{
    open: boolean;
    action: "approve" | "reject";
  }>({ open: false, action: "approve" });
  const [bulkRejectReason, setBulkRejectReason] = useState("");

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
  }, [filter, page]);

  // Filter change handler
  const handleFilterChange = useCallback(
    (newFilter: FilterType) => {
      if (newFilter === filter) return;
      setFilter(newFilter);
      setPage(1);
    },
    [filter]
  );

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const queryKey = ["admin-users", debouncedSearch, filter, page, pageSize];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filter === "ADMIN") params.set("role", "ADMIN");
      if (filter === "STAR") params.set("role", "STAR");
      if (filter === "pending") params.set("approved", "false");
      if (filter === "approved") params.set("approved", "true");

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
      return (await res.json()) as UsersResponse;
    },
  });

  // Single approve/reject
  const approveMutation = useMutation({
    mutationFn: async ({
      userId,
      approved,
      rejectionReason,
    }: {
      userId: string;
      approved: boolean;
      rejectionReason?: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, rejectionReason }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "처리에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (selectedUser?.id === variables.userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, isApproved: variables.approved } : null
        );
      }
      toast.success(
        variables.approved ? "사용자를 승인했습니다." : "사용자를 반려했습니다."
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Upload tier toggle
  const uploadTierMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/upload-tier`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "설정 변경에 실패했습니다.");
      return (await res.json()).data as { id: string; canDirectUpload: boolean };
    },
    onSuccess: (data) => {
      toast.success(data.canDirectUpload ? "직접 업로드 권한이 부여되었습니다." : "직접 업로드 권한이 해제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(prev => prev ? { ...prev, canDirectUpload: data.canDirectUpload } : null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Video visibility toggle
  const videoVisibilityMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/video-visibility`, { method: "PATCH" });
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "설정 변경에 실패했습니다.");
      return (await res.json()).data as { id: string; showVideosPublicly: boolean };
    },
    onSuccess: (data) => {
      toast.success(data.showVideosPublicly ? "영상이 공개 페이지에 표시됩니다." : "영상이 공개 페이지에서 숨겨집니다.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(prev => prev ? { ...prev, showVideosPublicly: data.showVideosPublicly } : null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Bulk approve/reject
  const bulkMutation = useMutation({
    mutationFn: async ({
      userIds,
      approved,
      rejectionReason,
    }: {
      userIds: string[];
      approved: boolean;
      rejectionReason?: string;
    }) => {
      const res = await fetch("/api/admin/users/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, approved, rejectionReason }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "일괄 처리에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedIds(new Set());
      setBulkDialog({ open: false, action: "approve" });
      setBulkRejectReason("");
      toast.success(
        variables.approved
          ? `${variables.userIds.length}명을 일괄 승인했습니다.`
          : `${variables.userIds.length}명을 일괄 반려했습니다.`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Email update
  const emailMutation = useMutation({
    mutationFn: async ({
      userId,
      email,
    }: {
      userId: string;
      email: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "이메일 변경에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser((prev) =>
        prev ? { ...prev, email: result.data.email } : null
      );
      setIsEditingEmail(false);
      toast.success("이메일이 변경되었습니다.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Magic link
  const magicLinkMutation = useMutation({
    mutationFn: async ({
      userId,
      email,
    }: {
      userId: string;
      email: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).error?.message ?? "매직링크 전송에 실패했습니다."
        );
      return res.json();
    },
    onSuccess: () => {
      toast.success("매직링크를 전송했습니다.");
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
    total: 0,
    adminCount: 0,
    starCount: 0,
    pendingCount: 0,
    approvedCount: 0,
  };

  const handleRowClick = (user: UserRow) => {
    setSelectedUser(user);
    setShowSensitive(false);
    setRejectReason("");
    setIsEditingEmail(false);
    setEditEmail(user.email);
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

  // Bulk action handlers
  const handleBulkApprove = () => {
    setBulkDialog({ open: true, action: "approve" });
  };

  const handleBulkReject = () => {
    setBulkDialog({ open: true, action: "reject" });
    setBulkRejectReason("");
  };

  const confirmBulkAction = () => {
    const userIds = Array.from(selectedIds);
    if (bulkDialog.action === "approve") {
      bulkMutation.mutate({ userIds, approved: true });
    } else {
      bulkMutation.mutate({
        userIds,
        approved: false,
        rejectionReason: bulkRejectReason.trim() || undefined,
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-foreground">
          사용자 목록을 불러오지 못했습니다
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
            모든 계정 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            가입한 스타 또는 어드민을 조회하고 정보를 관리하세요.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => exportToCSV(rows)}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          CSV 내보내기
        </Button>
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

      {/* ── [C] Filter Tabs + Search ───────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Tabs */}
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <div
            className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-max"
            role="tablist"
          >
            {getFilterTabs(stats).map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  filter === tab.key
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
            placeholder="이름 또는 이메일 검색..."
            className="pl-9 bg-card border-border shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-10" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-14" />
                      </TableHead>
                      <TableHead className="w-10">
                        <Skeleton className="h-4 w-6" />
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
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-5 w-14 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
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
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ── Mobile view ──────────────────────────────────────── */}
          <div className="block md:hidden">
            {filter === "pending" ? (
              <UserSwipeDeck
                users={rows.map(
                  (r) =>
                    ({
                      ...r,
                      createdAt: formatDate(r.createdAt),
                    }) as SwipeableUser
                )}
                onApprove={(id) =>
                  approveMutation.mutate({ userId: id, approved: true })
                }
                onReject={() =>
                  toast.info(
                    "모바일에서는 상세 보기 후 권한을 관리하세요."
                  )
                }
                onViewDetail={(u) => {
                  const matched = rows.find((r) => r.id === u.id);
                  if (matched) handleRowClick(matched);
                }}
              />
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-muted/50 rounded-full">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {search
                            ? "검색 결과가 없습니다"
                            : "가입한 사용자가 없습니다"}
                        </p>
                        <p className="text-sm mt-1">
                          {search
                            ? "다른 검색어를 시도해 보세요."
                            : "새로운 사용자가 가입하면 여기에 표시됩니다."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  rows.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <Avatar className="h-12 w-12 border-2 border-border">
                        <AvatarImage src={row.avatarUrl || ""} />
                        <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                          {row.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground truncate">
                            {row.name}
                          </h3>
                          {row.isApproved && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {row.email}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge
                          className={cn(
                            "border-none shadow-none text-[10px]",
                            row.isApproved
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {row.isApproved ? "승인됨" : "대기중"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
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
                              // indeterminate state for "some checked"
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
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        사용자
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        역할
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        상태
                      </TableHead>
                      <TableHead className="font-semibold text-xs text-muted-foreground">
                        가입일
                      </TableHead>
                      <TableHead className="w-10 font-semibold text-xs text-muted-foreground">
                        <span className="sr-only">액션</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="p-3 bg-muted/50 rounded-full">
                              <Users className="h-6 w-6" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">
                                {search
                                  ? "검색 결과가 없습니다"
                                  : "가입한 사용자가 없습니다"}
                              </p>
                              <p className="text-sm mt-1">
                                {search
                                  ? "다른 검색어를 시도해 보세요."
                                  : "새로운 사용자가 가입하면 여기에 표시됩니다."}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
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
                              aria-label={`${row.name} 선택`}
                            />
                          </TableCell>

                          {/* Composite user cell */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-border">
                                <AvatarImage src={row.avatarUrl || ""} />
                                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                  {row.name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-sm text-foreground truncate">
                                  {row.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {row.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Role badge */}
                          <TableCell>
                            <Badge
                              className={cn(
                                "border-none shadow-none",
                                row.role === "ADMIN"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-secondary text-secondary-foreground"
                              )}
                            >
                              {row.role === "ADMIN" ? "관리자" : "STAR"}
                            </Badge>
                          </TableCell>

                          {/* Status badge */}
                          <TableCell>
                            <Badge
                              className={cn(
                                "border-none shadow-none",
                                row.isApproved
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {row.isApproved ? "승인됨" : "대기중"}
                            </Badge>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(row.createdAt)}
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
                                <DropdownMenuSeparator />
                                {!row.isApproved ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        userId: row.id,
                                        approved: true,
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                    승인
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate({
                                        userId: row.id,
                                        approved: false,
                                      })
                                    }
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-rose-600" />
                                    승인 취소
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
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
              {selectedIds.size}명 선택됨
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              일괄 승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkReject}
              className="border-border text-rose-600 hover:bg-rose-500/10"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              일괄 반려
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
              {bulkDialog.action === "approve"
                ? `${selectedIds.size}명을 일괄 승인하시겠습니까?`
                : `${selectedIds.size}명을 일괄 반려하시겠습니까?`}
            </DialogTitle>
            <DialogDescription>
              {bulkDialog.action === "approve"
                ? "선택된 모든 사용자의 계정이 승인됩니다. 이 작업은 되돌릴 수 있습니다."
                : "선택된 모든 사용자의 계정이 반려됩니다. 이 작업은 되돌릴 수 있습니다."}
            </DialogDescription>
          </DialogHeader>

          {bulkDialog.action === "reject" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                반려 사유 (선택)
              </label>
              <textarea
                className="w-full rounded-xl border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                rows={2}
                placeholder="반려 사유를 입력하세요..."
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setBulkDialog({ open: false, action: "approve" })
              }
            >
              취소
            </Button>
            <Button
              onClick={confirmBulkAction}
              disabled={bulkMutation.isPending}
              className={
                bulkDialog.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
            >
              {bulkMutation.isPending
                ? "처리 중..."
                : bulkDialog.action === "approve"
                  ? "승인 실행"
                  : "반려 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── [H] Sheet Detail Panel ─────────────────────────────────── */}
      <Sheet
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 bg-card border-l border-border flex flex-col gap-0 shadow-2xl"
        >
          {selectedUser && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{selectedUser.name} 상세 정보</SheetTitle>
                <SheetDescription>
                  사용자 계정 상세 정보 및 관리
                </SheetDescription>
              </SheetHeader>

              {/* Header — bg-secondary (no gradient) */}
              <div className="relative h-28 bg-secondary p-6 flex items-end" />

              {/* Profile Overview */}
              <div className="px-6 pb-6 relative z-10 flex flex-col items-center -mt-12 mb-2">
                <Avatar className="h-24 w-24 border-4 border-card shadow-xl">
                  <AvatarImage
                    src={selectedUser.avatarUrl || ""}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl font-black bg-muted text-muted-foreground">
                    {selectedUser.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-4 text-center space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-foreground flex justify-center items-center gap-2">
                    {selectedUser.name}
                    {selectedUser.isApproved && (
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    )}
                  </h2>
                  {selectedUser.chineseName && (
                    <p className="text-sm font-medium text-muted-foreground">
                      {selectedUser.chineseName}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Badge
                    className={cn(
                      "rounded-full px-4 border-none",
                      selectedUser.role === "ADMIN"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {selectedUser.role === "ADMIN"
                      ? "관리자 계정"
                      : "스타 (STAR)"}
                  </Badge>
                  <Badge
                    className={cn(
                      "rounded-full px-4 border-none shadow-none",
                      selectedUser.isApproved
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {selectedUser.isApproved ? "승인 완료" : "승인 대기중"}
                  </Badge>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-6">
                {/* Personal Information Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/50 px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">
                      개인 정보
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Email — Editable */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          이메일 계정
                        </p>
                        {isEditingEmail ? (
                          <div className="space-y-2">
                            <Input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="새 이메일 주소"
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={
                                  emailMutation.isPending ||
                                  !editEmail.trim() ||
                                  editEmail === selectedUser.email
                                }
                                onClick={() =>
                                  emailMutation.mutate({
                                    userId: selectedUser.id,
                                    email: editEmail.trim(),
                                  })
                                }
                              >
                                {emailMutation.isPending ? (
                                  "저장 중..."
                                ) : (
                                  <>
                                    <Check className="w-3 h-3 mr-1" />
                                    저장
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => {
                                  setIsEditingEmail(false);
                                  setEditEmail(selectedUser.email);
                                }}
                              >
                                <X className="w-3 h-3 mr-1" />
                                취소
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {selectedUser.email}
                            </p>
                            <button
                              onClick={() => {
                                setEditEmail(selectedUser.email);
                                setIsEditingEmail(true);
                              }}
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                              title="이메일 수정"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {/* Magic Link Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 px-2.5 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                          disabled={
                            magicLinkMutation.isPending || isEditingEmail
                          }
                          onClick={() =>
                            magicLinkMutation.mutate({
                              userId: selectedUser.id,
                              email: selectedUser.email,
                            })
                          }
                        >
                          <Send className="w-3 h-3" />
                          {magicLinkMutation.isPending
                            ? "전송 중..."
                            : "매직링크 전송"}
                        </Button>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          연락처
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedUser.phone || "미등록"}
                        </p>
                      </div>
                    </div>

                    {/* ID Number */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5 flex justify-between">
                          주민등록번호
                          {selectedUser.idNumber && (
                            <button
                              onClick={() => setShowSensitive(!showSensitive)}
                              className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 -mt-1 cursor-pointer"
                            >
                              {showSensitive ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              <span className="text-[10px] uppercase font-bold">
                                {showSensitive ? "숨기기" : "보기"}
                              </span>
                            </button>
                          )}
                        </p>
                        <p
                          className={cn(
                            "text-sm text-foreground tracking-wider",
                            selectedUser.idNumber && showSensitive
                              ? "font-bold"
                              : "font-medium"
                          )}
                        >
                          {!selectedUser.idNumber
                            ? "미등록"
                            : showSensitive
                              ? selectedUser.idNumber
                              : maskIdNumber(selectedUser.idNumber)}
                        </p>
                      </div>
                    </div>

                    {/* Created At */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          가입일
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(selectedUser.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/50 px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">
                      정산 및 계좌 정보
                    </h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          은행명
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedUser.bankName || "미등록"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">
                          계좌번호
                        </p>
                        <p className="text-sm font-medium text-foreground font-mono tracking-tight">
                          {selectedUser.bankAccount || "미등록"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Tier Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/50 px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">업로드 권한 설정</h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Upload className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">직접 업로드</p>
                          <p className="text-xs text-muted-foreground">프로젝트/승인 없이 바로 업로드 가능</p>
                        </div>
                      </div>
                      <button
                        onClick={() => uploadTierMutation.mutate(selectedUser.id)}
                        disabled={uploadTierMutation.isPending}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                          selectedUser.canDirectUpload ? "bg-indigo-500" : "bg-muted-foreground/30"
                        )}
                        role="switch"
                        aria-checked={selectedUser.canDirectUpload}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                          selectedUser.canDirectUpload ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                    <p className={cn(
                      "mt-3 text-xs px-3 py-2 rounded-lg",
                      selectedUser.canDirectUpload
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {selectedUser.canDirectUpload ? "직접 업로드 활성화됨 — 이 계정은 프로젝트 없이 영상을 즉시 등록할 수 있습니다." : "비활성화 — 일반 프로젝트 기반 업로드 방식 적용"}
                    </p>
                  </div>
                </div>

                {/* Video Visibility Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="bg-muted/50 px-5 py-3 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground">영상 공개 설정</h3>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", selectedUser.showVideosPublicly ? "bg-emerald-500/10" : "bg-muted")}>
                          {selectedUser.showVideosPublicly
                            ? <Eye className="w-4 h-4 text-emerald-500" />
                            : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">공개 페이지 노출</p>
                          <p className="text-xs text-muted-foreground">탐색·검색·메인 등 공유 페이지에 영상 표시 여부</p>
                        </div>
                      </div>
                      <button
                        onClick={() => videoVisibilityMutation.mutate(selectedUser.id)}
                        disabled={videoVisibilityMutation.isPending}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                          selectedUser.showVideosPublicly ? "bg-emerald-500" : "bg-muted-foreground/30"
                        )}
                        role="switch"
                        aria-checked={selectedUser.showVideosPublicly}
                      >
                        <span className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                          selectedUser.showVideosPublicly ? "translate-x-6" : "translate-x-1"
                        )} />
                      </button>
                    </div>
                    <p className={cn(
                      "mt-3 text-xs px-3 py-2 rounded-lg",
                      selectedUser.showVideosPublicly
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {selectedUser.showVideosPublicly
                        ? "공개 중 — 이 계정의 영상이 탐색·검색·메인 페이지에 노출됩니다."
                        : "숨김 — 이 계정의 영상은 공개 페이지에 표시되지 않습니다."}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 pb-2">
                  {!selectedUser.isApproved ? (
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold h-14 rounded-xl shadow-lg shadow-emerald-600/20"
                      disabled={approveMutation.isPending}
                      onClick={() =>
                        approveMutation.mutate({
                          userId: selectedUser.id,
                          approved: true,
                        })
                      }
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {selectedUser.name}님 계정 승인하기
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          반려 사유 (선택)
                        </label>
                        <textarea
                          className="w-full rounded-xl border border-border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                          rows={2}
                          placeholder="반려 사유를 입력하세요..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-border text-rose-600 hover:bg-rose-500/10 font-bold h-14 rounded-xl active:scale-[0.98] transition-all"
                        disabled={approveMutation.isPending}
                        onClick={() => {
                          approveMutation.mutate({
                            userId: selectedUser.id,
                            approved: false,
                            rejectionReason:
                              rejectReason.trim() || undefined,
                          });
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="mr-2 h-5 w-5" />
                        가입 승인 취소 (반려)
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
