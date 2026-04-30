"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { downloadSettlementsExcel } from "@/lib/settlement-excel";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Users,
  FileText,
  CheckCircle2,
  CalendarIcon,
  Download,
  Settings,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Plus,
  Clock,
  Pencil,
  Save,
  X,
  TrendingUp,
  Folder,
  FolderOpen,
  FolderPlus,
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { DateRange } from "react-day-picker";
import { ko } from "date-fns/locale";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { StatCard } from "@/components/settlement/stat-card";
import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
import { ConfettiTrigger } from "@/components/settlement/confetti-trigger";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { formatKRW, formatDateRange, getDefaultDateRange } from "@/lib/settlement-utils";
import { SettlementDetailSheet, type SettlementDetail } from "@/components/admin/settlement-detail-sheet";
import SettlementAnalytics from "@/components/settlement/settlement-analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementRow = {
  id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  status: string;
  paymentDate: string | null;
  note: string | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  star: {
    id: string;
    name: string;
    chineseName: string | null;
    email: string;
    phone: string | null;
    idNumber: string | null;
    bankName: string | null;
    bankAccount: string | null;
  };
  _count: { items: number };
};

type SettlementFolder = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  count: number;
  totalAmount: number;
  netAmount: number;
  taxAmount: number;
};

type SettlementsResponse = {
  data: SettlementRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type SystemSetting = {
  id: string;
  key: string;
  value: string;
  label: string | null;
};

type GenerateResponse = {
  data: unknown[];
  warnings?: {
    skippedStars: { id: string; name: string; reason: string }[];
    completedStars: { id: string; name: string }[];
    deletedCount?: number;
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "검토 대기" },
  { value: "REVIEW", label: "검토 중" },
  { value: "PROCESSING", label: "처리 중" },
  { value: "COMPLETED", label: "완료" },
  { value: "FAILED", label: "실패" },
  { value: "CANCELLED", label: "취소됨" },
] as const;

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

const STATUS_GLOW_MAP: Record<string, { label: string; variant: GlowVariant }> = {
  PENDING: { label: "검토 대기", variant: "pending" },
  REVIEW: { label: "검토 중", variant: "pending" },
  PROCESSING: { label: "처리 중", variant: "processing" },
  COMPLETED: { label: "완료", variant: "completed" },
  FAILED: { label: "실패", variant: "failed" },
  CANCELLED: { label: "취소됨", variant: "failed" },
};

const SCOPE_TABS = [
  { value: "active", label: "진행 중" },
  { value: "archive", label: "아카이브" },
  { value: "all", label: "전체" },
] as const;

type ScopeValue = (typeof SCOPE_TABS)[number]["value"];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStarDisplayName(star: { name: string; chineseName?: string | null }): string {
  return star.chineseName || star.name;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(Math.round(amount)) + "원";
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminSettlementsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter — URL-synced
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>(() => searchParams.get("status") ?? "ALL");
  const [filterScope, setFilterScope] = useState<ScopeValue>(() => {
    const s = searchParams.get("scope");
    return (s === "archive" || s === "all" || s === "active") ? s : "active";
  });
  const [filterYear, setFilterYear] = useState<string>(() => searchParams.get("year") ?? "ALL");

  // 페이지 이탈 시 미확정(PENDING/REVIEW) 정산 삭제
  useEffect(() => {
    const clearPending = () => {
      navigator.sendBeacon("/api/settlements/clear-pending");
    };
    window.addEventListener("beforeunload", clearPending);
    return () => {
      window.removeEventListener("beforeunload", clearPending);
      // 인앱 네비게이션(컴포넌트 언마운트) 시에도 삭제
      fetch("/api/settlements/clear-pending", { method: "POST", keepalive: true }).catch(() => {});
    };
  }, []);

  // Sync state -> URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filterScope !== "active") params.set("scope", filterScope);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterYear !== "ALL") params.set("year", filterYear);
    const qs = params.toString();
    const wantedSearch = qs ? `?${qs}` : "";
    if (window.location.search === wantedSearch) return;
    router.replace(wantedSearch || window.location.pathname, { scroll: false });
    // router는 stable 참조이므로 deps 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterScope, filterStatus, filterYear]);

  // Cancel reason state
  const [cancelReason, setCancelReason] = useState("");

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genDateRange, setGenDateRange] = useState<DateRange | undefined>(() => {
    const { startDate, endDate } = getDefaultDateRange();
    return { from: startDate, to: endDate };
  });

  // Confirm / Delete / Cancel
  const [confirmTarget, setConfirmTarget] = useState<SettlementRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettlementRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SettlementRow | null>(null);

  // Detail Sheet
  const [detailId, setDetailId] = useState<string | null>(null);

  // Checkbox selection for Excel download
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Settings edit
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Bulk action
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [isBulking, setIsBulking] = useState(false);

  // StatCard expand
  const [expandedCard, setExpandedCard] = useState<"pending" | "processing" | null>(null);

  // Folder
  const [archiveFolderView, setArchiveFolderView] = useState<string | null>(null); // null=grid, folderId|"unfiled"=detail
  const [confirmFolderId, setConfirmFolderId] = useState<string | null | "new">(null); // null=미분류, "new"=새 폴더
  const [confirmNewFolderName, setConfirmNewFolderName] = useState("");
  const [folderManageTarget, setFolderManageTarget] = useState<SettlementFolder | null>(null);
  const [folderRenameValue, setFolderRenameValue] = useState("");

  // Query string for API
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    params.set("scope", filterScope);
    if (filterDateRange?.from) params.set("startDate", filterDateRange.from.toISOString().slice(0, 10));
    if (filterDateRange?.to) params.set("endDate", filterDateRange.to.toISOString().slice(0, 10));
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    if (filterYear !== "ALL") params.set("year", filterYear);
    if (filterScope === "archive" && archiveFolderView) params.set("folderId", archiveFolderView);
    return params.toString();
  }, [filterDateRange, filterStatus, filterScope, filterYear, archiveFolderView]);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: settlementsData, isLoading } = useQuery({
    queryKey: ["admin-settlements", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/settlements?${queryString}`, { cache: "no-store" });
      if (!res.ok) throw new Error("정산 목록을 불러오지 못했습니다.");
      return (await res.json()) as SettlementsResponse;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["settlement-detail", detailId],
    queryFn: async () => {
      const res = await fetch(`/api/settlements/${detailId}`);
      if (!res.ok) throw new Error("정산 상세를 불러오지 못했습니다.");
      return (await res.json()) as { data: SettlementDetail };
    },
    enabled: !!detailId,
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ["settlement-config"],
    queryFn: async () => {
      const res = await fetch("/api/settlements/config");
      if (!res.ok) throw new Error("설정을 불러오지 못했습니다.");
      return (await res.json()) as { data: SystemSetting[] };
    },
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["settlement-folders"],
    queryFn: async () => {
      const res = await fetch("/api/settlement-folders");
      if (!res.ok) throw new Error("폴더 목록을 불러오지 못했습니다.");
      return (await res.json()) as { data: SettlementFolder[] };
    },
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settlements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: genDateRange?.from?.toISOString().slice(0, 10),
          endDate: (genDateRange?.to ?? genDateRange?.from)?.toISOString().slice(0, 10),
          confirmDeletePending: true,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 생성에 실패했습니다.");
      }
      return (await res.json()) as GenerateResponse;
    },
    onSuccess: async (result) => {
      const createdCount = result.data?.length ?? 0;
      const rangeStr = genDateRange?.from ? formatDateRange(genDateRange.from, genDateRange.to ?? genDateRange.from) : "";
      toast.success(`${rangeStr} 정산이 ${createdCount}건 생성되었습니다.`);
      if (result.warnings?.skippedStars?.length) {
        const names = result.warnings.skippedStars.map((s) => s.name).join(", ");
        toast.warning(`기본 단가 미설정으로 제외된 STAR: ${names}`, {
          description: "관리자 > 단가 설정에서 기본 단가를 설정해주세요.",
          duration: 8000,
        });
      }
      if (result.warnings?.completedStars?.length) {
        const names = result.warnings.completedStars.map((s) => s.name).join(", ");
        toast.info(`이미 확정된 정산 STAR (변경 불가): ${names}`, { duration: 5000 });
      }
      if ((result.warnings?.deletedCount ?? 0) > 0) {
        toast.warning(`기존 진행 중 정산 ${result.warnings?.deletedCount}건이 재생성되었습니다.`, { duration: 6000 });
      }
      setGenerateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "정산 생성에 실패했습니다."),
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, folderId, newFolderName }: { id: string; folderId?: string | null; newFolderName?: string }) => {
      const body: Record<string, unknown> = {};
      if (folderId !== undefined) body.folderId = folderId;
      if (newFolderName) body.newFolderName = newFolderName;
      const res = await fetch(`/api/settlements/${id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 확정에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("정산이 확정되었습니다!");
      setShowConfetti(true);
      setConfirmTarget(null);
      setConfirmFolderId(null);
      setConfirmNewFolderName("");
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      await queryClient.invalidateQueries({ queryKey: ["settlement-folders"] });
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 확정에 실패했습니다.");
      setConfirmTarget(null);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/settlement-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "폴더 생성에 실패했습니다.");
      }
      return (await res.json()) as { data: { id: string; name: string } };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settlement-folders"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "폴더 생성에 실패했습니다."),
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/settlement-folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "폴더 이름 변경에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("폴더 이름이 변경되었습니다.");
      setFolderManageTarget(null);
      setFolderRenameValue("");
      await queryClient.invalidateQueries({ queryKey: ["settlement-folders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "폴더 이름 변경에 실패했습니다."),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settlement-folders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "폴더 삭제에 실패했습니다.");
      }
      return (await res.json()) as { data: { deletedSettlementCount: number } };
    },
    onSuccess: async (result) => {
      const n = result?.data?.deletedSettlementCount ?? 0;
      toast.success(
        n > 0
          ? `폴더와 안에 있던 정산 ${n}건이 삭제되었습니다.`
          : "폴더가 삭제되었습니다.",
      );
      setFolderManageTarget(null);
      if (archiveFolderView === folderManageTarget?.id) setArchiveFolderView(null);
      await queryClient.invalidateQueries({ queryKey: ["settlement-folders"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "폴더 삭제에 실패했습니다."),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/settlements/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 확정 취소에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("정산 확정이 취소되었습니다. (대기 상태로 변경됨)");
      setCancelTarget(null);
      setCancelReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 확정 취소에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settlements/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 삭제에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("정산이 삭제되었습니다.");
      if (detailId === deleteTarget?.id) setDetailId(null);
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 삭제에 실패했습니다.");
      setDeleteTarget(null);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/settlements/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("설정 저장에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("설정이 저장되었습니다.");
      setEditingKey(null);
      await queryClient.invalidateQueries({ queryKey: ["settlement-config"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "설정 저장에 실패했습니다."),
  });

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const rows = useMemo(() => settlementsData?.data ?? [], [settlementsData]);
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const processingCount = rows.filter((r) => r.status === "PROCESSING").length;
  const completedCount = rows.filter((r) => r.status === "COMPLETED").length;
  const totalSum = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);


  const starGroups = useMemo(() => {
    const map = new Map<string, { star: SettlementRow["star"]; settlements: SettlementRow[] }>();
    for (const row of rows) {
      const existing = map.get(row.star.id);
      if (existing) {
        existing.settlements.push(row);
      } else {
        map.set(row.star.id, { star: row.star, settlements: [row] });
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const detail = detailData?.data;
  const settings = configData?.data ?? [];

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleOpenDetail = useCallback((id: string) => {
    setDetailId(id);
  }, []);




  const handleStartConfigEdit = useCallback((key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  }, []);

  const handleSaveConfig = useCallback(() => {
    if (editingKey) updateConfigMutation.mutate({ key: editingKey, value: editValue });
  }, [editingKey, editValue, updateConfigMutation]);

  const handleDetailMutate = useCallback(async () => {
    if (detailId) {
      await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    }
  }, [detailId, queryClient]);

  const handleRequestConfirm = useCallback(() => {
    if (detail) {
      const row = rows.find((r) => r.id === detail.id);
      if (row) setConfirmTarget(row);
    }
  }, [detail, rows]);

  const handleRequestCancel = useCallback(() => {
    if (detail) {
      const row = rows.find((r) => r.id === detail.id);
      if (row) setCancelTarget(row);
    }
  }, [detail, rows]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === rows.length) return new Set();
      return new Set(rows.map((r) => r.id));
    });
  }, [rows]);

  const [excelDownloading, setExcelDownloading] = useState(false);
  const handleExcelDownload = useCallback(async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : rows.map((r) => r.id);
    if (ids.length === 0) return;
    setExcelDownloading(true);
    try {
      await downloadSettlementsExcel(ids);
      toast.success(`${ids.length}건의 정산을 엑셀로 다운로드했습니다.`);
    } catch {
      toast.error("엑셀 다운로드에 실패했습니다.");
    } finally {
      setExcelDownloading(false);
    }
  }, [selectedIds, rows]);

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setIsBulking(true);
    try {
      const res = await fetch("/api/settlements/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkAction, ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "일괄 처리 실패");
      toast.success(`성공 ${data.data.success}건, 실패 ${data.data.failed}건`);
      setSelectedIds(new Set());
      setBulkAction("");
      setBulkConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsBulking(false);
    }
  }, [bulkAction, selectedIds, queryClient]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <ConfettiTrigger trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">월별 정산을 생성하고, STAR별로 관리하세요.</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            대시보드
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <FileText className="h-4 w-4" />
            정산 목록
          </TabsTrigger>
          <TabsTrigger value="stars" className="gap-1.5">
            <Users className="h-4 w-4" />
            STAR별
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-4 w-4" />
            설정
          </TabsTrigger>
        </TabsList>

        {/* ======================== Overview Tab ======================== */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold tracking-tight">요약 및 분석</h2>
          </div>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-start">
            <StatCard title="총 정산액" value={totalSum} suffix="원" icon={DollarSign} iconColor="text-emerald-500" delay={0} />

            {/* PENDING StatCard — clickable */}
            <div className="flex flex-col gap-2">
              <StatCard
                title="대기중"
                value={pendingCount}
                suffix="건"
                icon={Clock}
                iconColor="text-amber-500"
                delay={0.1}
                onClick={() => setExpandedCard(expandedCard === "pending" ? null : "pending")}
                className="cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all"
              />
              <AnimatePresence>
                {expandedCard === "pending" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {rows.filter(r => r.status === "PENDING").length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">대기중 정산이 없습니다</p>
                      ) : (
                        rows.filter(r => r.status === "PENDING").map((row, i) => (
                          <motion.div
                            key={row.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleOpenDetail(row.id)}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">{row.star.name}</p>
                              <p className="text-xs text-muted-foreground">{formatDateRange(new Date(row.startDate), new Date(row.endDate))}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatKRW(row.totalAmount)}</p>
                              <GlowBadge variant="pending" label="대기중" />
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* PROCESSING StatCard — clickable */}
            <div className="flex flex-col gap-2">
              <StatCard
                title="처리중"
                value={processingCount}
                suffix="건"
                icon={Clock}
                iconColor="text-blue-500"
                delay={0.2}
                onClick={() => setExpandedCard(expandedCard === "processing" ? null : "processing")}
                className="cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
              />
              <AnimatePresence>
                {expandedCard === "processing" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {rows.filter(r => r.status === "PROCESSING").length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">처리중 정산이 없습니다</p>
                      ) : (
                        rows.filter(r => r.status === "PROCESSING").map((row, i) => (
                          <motion.div
                            key={row.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleOpenDetail(row.id)}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">{row.star.name}</p>
                              <p className="text-xs text-muted-foreground">{formatDateRange(new Date(row.startDate), new Date(row.endDate))}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{formatKRW(row.totalAmount)}</p>
                              <GlowBadge variant="processing" label="처리중" />
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <StatCard title="확정 완료" value={completedCount} suffix="건" icon={CheckCircle2} iconColor="text-cyan-500" delay={0.3} />
          </div>

          {/* Analytics Charts */}
          <SettlementAnalytics />
        </TabsContent>

        {/* ======================== List Tab ======================== */}
        <TabsContent value="list" className="space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold tracking-tight">발행된 정산 내역</h2>
            <Button onClick={() => setGenerateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              정산 생성
            </Button>
          </div>

          {/* Sub-tab: scope */}
          <div className="flex items-center gap-2 border-b pb-2">
            {SCOPE_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setFilterScope(t.value);
                  setArchiveFolderView(null);
                  if (t.value !== "archive") setFilterYear("ALL");
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filterScope === t.value
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {filterScope === "archive" && (
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[110px] h-8">
                    <SelectValue placeholder="연도" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 연도</SelectItem>
                    {YEAR_OPTIONS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <span className="text-xs text-muted-foreground">
                {filterScope === "active" && "현재 처리 대기/진행 중인 정산"}
                {filterScope === "archive" && "확정/실패/취소된 지난 정산"}
                {filterScope === "all" && "모든 정산 (주의: 오래된 건까지 포함)"}
              </span>
            </div>
          </div>

          {/* ========== Archive Folder Grid ========== */}
          {filterScope === "archive" && archiveFolderView === null ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">폴더를 선택하거나 새 폴더를 만드세요.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    const name = prompt("새 폴더 이름을 입력하세요 (예: 2024년 1월):");
                    if (name?.trim()) createFolderMutation.mutate(name.trim());
                  }}
                  disabled={createFolderMutation.isPending}
                >
                  <FolderPlus className="h-4 w-4" />
                  새 폴더
                </Button>
              </div>

              {/* Folder Grid */}
              {foldersLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* 미분류 카드 */}
                  <button
                    type="button"
                    onClick={() => setArchiveFolderView("unfiled")}
                    className="text-left rounded-xl border bg-card shadow-sm hover:ring-2 hover:ring-primary/40 transition-all"
                  >
                    <div className="p-4 flex items-start gap-3">
                      <Folder className="h-8 w-8 text-muted-foreground/60 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">미분류</p>
                        <p className="text-xs text-muted-foreground mt-0.5">폴더 없이 확정된 정산</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-0.5" />
                    </div>
                  </button>

                  {/* 폴더 카드 */}
                  {(foldersData?.data ?? []).map((folder) => (
                    <div
                      key={folder.id}
                      className="rounded-xl border bg-card shadow-sm hover:ring-2 hover:ring-amber-400/50 transition-all cursor-pointer"
                      onClick={() => setArchiveFolderView(folder.id)}
                    >
                      <div className="p-4 flex items-start gap-3">
                        <FolderOpen className="h-8 w-8 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{folder.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {folder.count}건 · {formatAmount(folder.netAmount)} 실지급
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 -mt-0.5 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderManageTarget(folder);
                                setFolderRenameValue(folder.name);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              이름 변경
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?\n안에 들어있는 정산도 함께 삭제됩니다. (되돌릴 수 없음)`)) {
                                  deleteFolderMutation.mutate(folder.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              폴더 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 폴더 이름 변경 다이얼로그 */}
              {folderManageTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setFolderManageTarget(null)}>
                  <div className="bg-background rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
                    <p className="font-semibold">폴더 이름 변경</p>
                    <Input
                      autoFocus
                      value={folderRenameValue}
                      onChange={(e) => setFolderRenameValue(e.target.value)}
                      maxLength={50}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && folderRenameValue.trim()) renameFolderMutation.mutate({ id: folderManageTarget.id, name: folderRenameValue.trim() });
                        if (e.key === "Escape") setFolderManageTarget(null);
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setFolderManageTarget(null)}>취소</Button>
                      <Button
                        size="sm"
                        disabled={!folderRenameValue.trim() || renameFolderMutation.isPending}
                        onClick={() => renameFolderMutation.mutate({ id: folderManageTarget.id, name: folderRenameValue.trim() })}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <>
          {filterScope === "archive" && archiveFolderView && (
            <div className="flex items-center gap-3 border-b pb-3">
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setArchiveFolderView(null)}>
                <ArrowLeft className="h-4 w-4" />
                폴더 목록
              </Button>
              <Separator orientation="vertical" className="h-5" />
              {archiveFolderView === "unfiled" ? (
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  미분류
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  {foldersData?.data.find((f) => f.id === archiveFolderView)?.name ?? "폴더"}
                </div>
              )}
            </div>
          )}

          {/* Filter Bar */}
          <AnimatedCard delay={0.15}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  placeholder="시작일"
                  value={filterDateRange?.from?.toISOString().slice(0, 10) ?? ""}
                  onChange={(e) => {
                    const from = e.target.value ? new Date(e.target.value) : undefined;
                    setFilterDateRange(from ? { from, to: filterDateRange?.to } : undefined);
                  }}
                  className="w-40"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  placeholder="종료일"
                  value={filterDateRange?.to?.toISOString().slice(0, 10) ?? ""}
                  onChange={(e) => {
                    const to = e.target.value ? new Date(e.target.value) : undefined;
                    setFilterDateRange(prev => prev ? { from: prev.from, to } : undefined);
                  }}
                  className="w-40"
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              
              {/* Bulk Actions UI */}
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 md:border-l md:pl-4 border-border/60">
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1.5 rounded-md">
                    {selectedIds.size}건 선택
                  </span>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="상태 일괄변경..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONFIRM">선택건 확정 처리</SelectItem>
                      <SelectItem value="CANCEL">선택건 승인 대기로(취소)</SelectItem>
                      <SelectItem value="DELETE">건별 영구 삭제</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    variant={bulkAction === "DELETE" ? "destructive" : "default"} 
                    disabled={!bulkAction || isBulking}
                    onClick={() => setBulkConfirmOpen(true)}
                  >
                    {isBulking ? "처리중..." : "적용"}
                  </Button>
                </div>
              )}

              <div className="ml-auto flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                <Button
                  variant="outline"
                  onClick={handleExcelDownload}
                  disabled={excelDownloading || rows.length === 0}
                  className="gap-1.5 w-full md:w-auto"
                >
                  <Download className="h-4 w-4" />
                  {selectedIds.size > 0 ? `${selectedIds.size}건 엑셀 다운로드` : "전체 엑셀 다운로드"}
                </Button>
              </div>
            </div>
          </AnimatedCard>

          {/* Table (Desktop & Mobile view) */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`sk-${i}`} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <AnimatedCard delay={0.2}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={rows.length > 0 && selectedIds.size === rows.length}
                            onCheckedChange={handleToggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>연월</TableHead>
                        <TableHead>STAR</TableHead>
                        <TableHead className="text-center">항목</TableHead>
                        <TableHead className="text-right">총액</TableHead>
                        <TableHead className="text-center">상태</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 opacity-40" />
                              <p>정산 내역이 없습니다.</p>
                              <p className="text-xs">상단에서 정산을 생성해주세요.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <AnimatePresence>
                          {rows.map((row, index) => (
                            <motion.tr
                              key={row.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03, duration: 0.2 }}
                              className="group cursor-pointer border-b transition-colors hover:bg-muted/50"
                              onClick={() => handleOpenDetail(row.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.has(row.id)}
                                  onCheckedChange={() => handleToggleSelect(row.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatDateRange(new Date(row.startDate), new Date(row.endDate))}
                              </TableCell>
                              <TableCell>{getStarDisplayName(row.star)}</TableCell>
                              <TableCell className="text-center">{row._count.items}건</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {Number(row.totalAmount) === 0 ? (
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    0원
                                  </span>
                                ) : (
                                  formatAmount(Number(row.totalAmount))
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <GlowBadge
                                  label={STATUS_GLOW_MAP[row.status]?.label ?? row.status}
                                  variant={STATUS_GLOW_MAP[row.status]?.variant ?? "pending"}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  {(row.status === "PENDING" || row.status === "PROCESSING") && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmTarget(row)}
                                        disabled={completeMutation.isPending}
                                      >
                                        확정
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteTarget(row)}
                                        disabled={deleteMutation.isPending}
                                        className="text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </TableBody>
                  </Table>
                </AnimatedCard>
              </div>

              {/* Mobile Receipt-style Card List */}
              <div className="block md:hidden space-y-3 mt-4">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-slate-50/20 dark:bg-slate-900/10 rounded-2xl border border-dashed flex flex-col items-center">
                    <FileText className="h-8 w-8 opacity-40 mb-2" />
                    <p>정산 내역이 없습니다.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {rows.map((row, index) => (
                      <motion.div
                        key={row.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-all shadow-sm"
                        onClick={() => handleOpenDetail(row.id)}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedIds.has(row.id)}
                              onCheckedChange={() => handleToggleSelect(row.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-foreground leading-tight">{getStarDisplayName(row.star)}</h3>
                              <p className="text-[10px] text-slate-500">{formatDateRange(new Date(row.startDate), new Date(row.endDate))}</p>
                            </div>
                          </div>
                          <GlowBadge
                            label={STATUS_GLOW_MAP[row.status]?.label ?? row.status}
                            variant={STATUS_GLOW_MAP[row.status]?.variant ?? "pending"}
                          />
                        </div>

                        {/* Body */}
                        <div className="flex justify-between items-center text-sm pt-1">
                          <div className="text-slate-500">
                            총 {row._count.items}건 항목
                          </div>
                          <div className="font-bold text-lg tracking-tight">
                            {Number(row.totalAmount) === 0 ? (
                              <span className="text-amber-600 flex items-center gap-1 text-sm"><AlertTriangle className="w-3.5 h-3.5" /> 0원</span>
                            ) : (
                              formatAmount(Number(row.totalAmount))
                            )}
                          </div>
                        </div>

                        {/* Footer / Actions */}
                        {(row.status === "PENDING" || row.status === "PROCESSING") && (
                          <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                            <Button
                              variant="default"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-foreground font-bold h-10"
                              onClick={(e) => { e.stopPropagation(); setConfirmTarget(row); }}
                              disabled={completeMutation.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1.5" /> 확정 승인
                            </Button>
                            <Button
                              variant="outline"
                              className="border-rose-200 text-rose-600 h-10 px-3"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}
          </>
          )}
        </TabsContent>

        {/* ======================== Stars Tab ======================== */}
        <TabsContent value="stars" className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={`star-sk-${i}`} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : starGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="h-10 w-10 opacity-40 mb-3" />
              <p>정산 대상 STAR가 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {starGroups.map((group, index) => {
                const starTotal = group.settlements.reduce((s, r) => s + Number(r.totalAmount), 0);
                const itemCount = group.settlements.reduce((s, r) => s + r._count.items, 0);
                const hasCompleted = group.settlements.some((s) => s.status === "COMPLETED");
                const hasPending = group.settlements.some((s) => s.status === "PENDING" || s.status === "PROCESSING");

                return (
                  <AnimatedCard key={group.star.id} delay={index * 0.05} className="cursor-pointer">
                    <div
                      className="p-5"
                      onClick={() => {
                        const first = group.settlements[0];
                        if (first) handleOpenDetail(first.id);
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-base">{getStarDisplayName(group.star)}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{group.star.email}</p>
                        </div>
                        <div className="flex gap-1">
                          {hasCompleted && <GlowBadge label="확정" variant="completed" size="sm" />}
                          {hasPending && <GlowBadge label="대기" variant="pending" size="sm" />}
                        </div>
                      </div>

                      <Separator className="mb-4" />

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">정산 건수</p>
                          <p className="text-lg font-bold tabular-nums">{group.settlements.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">항목</p>
                          <p className="text-lg font-bold tabular-nums">{itemCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">총액</p>
                          <NumberTicker value={starTotal} suffix="원" className="text-lg font-bold" />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end text-xs text-muted-foreground">
                        상세 보기
                        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </div>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ======================== Settings Tab ======================== */}
        <TabsContent value="settings" className="space-y-6">
          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground mb-4">
              정산에 적용되는 기본 설정을 관리합니다. 변경 사항은 다음 정산 생성 시 반영됩니다.
            </p>

            {configLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={`cfg-sk-${i}`} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {settings.map((setting, index) => (
                  <AnimatedCard key={setting.id} delay={index * 0.08}>
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{setting.label ?? setting.key}</p>
                        {editingKey === setting.key ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="max-w-[200px] h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveConfig();
                                if (e.key === "Escape") setEditingKey(null);
                              }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleSaveConfig} disabled={updateConfigMutation.isPending}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold tabular-nums mt-1">
                            {setting.key === "ai_tool_support_fee"
                              ? formatKRW(Number(setting.value))
                              : setting.key === "tax_rate"
                                ? `${setting.value}%`
                                : setting.value}
                          </p>
                        )}
                      </div>
                      {editingKey !== setting.key && (
                        <Button variant="ghost" size="sm" onClick={() => handleStartConfigEdit(setting.key, setting.value)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================== Generate Dialog ======================== */}
      <ResponsiveModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        title="월별 정산 생성"
        description="해당 기간의 승인된 제출물을 기반으로 정산을 자동 생성합니다."
        className="sm:max-w-[600px]"
      >
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          ※ 이미 대기중인 정산은 재생성됩니다. 확정된 정산은 유지됩니다.
        </p>
        <div className="flex flex-col gap-4">
          {/* Quick select buttons */}
          <div className="flex gap-2 mb-1">
            <Button variant="outline" size="sm" onClick={() => {
              const { startDate, endDate } = getDefaultDateRange();
              setGenDateRange({ from: startDate, to: endDate });
            }}>이번 달</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
              const end = new Date(now.getFullYear(), now.getMonth(), 0);
              setGenDateRange({ from: start, to: end });
            }}>지난 달</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setGenDateRange({ from: start, to: end });
            }}>최근 3개월</Button>
          </div>
          {/* Calendar DateRange picker */}
          <div className="flex justify-center">
            <Calendar
              mode="range"
              locale={ko}
              selected={genDateRange}
              onSelect={setGenDateRange}
              numberOfMonths={2}
              className="rounded-md border"
            />
          </div>
          {/* Selected range display */}
          {genDateRange?.from && (
            <p className="text-sm text-muted-foreground text-center">
              선택: {formatDateRange(genDateRange.from, genDateRange.to ?? genDateRange.from)}
            </p>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !genDateRange?.from} className="gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {generateMutation.isPending ? "생성 중..." : "정산 생성"}
          </Button>
        </div>
      </ResponsiveModal>

      {/* ======================== Confirm Dialog (폴더 선택) ======================== */}
      <ResponsiveModal
        open={!!confirmTarget}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setConfirmFolderId(null);
            setConfirmNewFolderName("");
          }
        }}
        title="정산 확정"
        description={confirmTarget ? `${getStarDisplayName(confirmTarget.star)}님의 ${formatDateRange(new Date(confirmTarget.startDate), new Date(confirmTarget.endDate))} 정산(${formatAmount(Number(confirmTarget.totalAmount))})을 확정합니다.` : ""}
        className="sm:max-w-[480px]"
      >
        {confirmTarget && (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              확정 후에는 삭제하거나 재생성할 수 없습니다.
            </div>

            {/* 폴더 선택 */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-amber-500" />
                아카이브 폴더 선택 <span className="text-muted-foreground font-normal">(선택사항)</span>
              </p>

              {/* 미분류 */}
              <button
                type="button"
                onClick={() => setConfirmFolderId(null)}
                className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${confirmFolderId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">미분류 (폴더 없이 확정)</span>
                {confirmFolderId === null && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
              </button>

              {/* 기존 폴더 목록 */}
              {foldersLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                (foldersData?.data ?? []).map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setConfirmFolderId(folder.id)}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${confirmFolderId === folder.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">{folder.count}건</p>
                    </div>
                    {confirmFolderId === folder.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                ))
              )}

              {/* 새 폴더 만들기 */}
              <button
                type="button"
                onClick={() => setConfirmFolderId("new")}
                className={`w-full flex items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors ${confirmFolderId === "new" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <FolderPlus className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">+ 새 폴더 만들기</span>
              </button>

              {confirmFolderId === "new" && (
                <Input
                  autoFocus
                  placeholder="폴더 이름 입력 (예: 2024년 1월)"
                  value={confirmNewFolderName}
                  onChange={(e) => setConfirmNewFolderName(e.target.value)}
                  maxLength={50}
                  className="mt-1"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setConfirmTarget(null); setConfirmFolderId(null); setConfirmNewFolderName(""); }}>
                취소
              </Button>
              <Button
                disabled={completeMutation.isPending || (confirmFolderId === "new" && confirmNewFolderName.trim().length === 0)}
                onClick={() => {
                  if (!confirmTarget) return;
                  if (confirmFolderId === "new") {
                    completeMutation.mutate({ id: confirmTarget.id, newFolderName: confirmNewFolderName.trim() });
                  } else {
                    completeMutation.mutate({ id: confirmTarget.id, folderId: confirmFolderId });
                  }
                }}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                {completeMutation.isPending ? "처리 중..." : "확정"}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* ======================== Cancel Dialog ======================== */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              정산 확정을 취소하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {cancelTarget && (
                  <>
                    <strong className="text-foreground">{getStarDisplayName(cancelTarget.star)}</strong>님의{" "}
                    {formatDateRange(new Date(cancelTarget.startDate), new Date(cancelTarget.endDate))} 정산의 확정 상태를 해제하고 다시 대기 상태로 변경합니다.
                    <br />
                    <br />
                    <span className="text-xs text-amber-600 font-medium">
                      ※ 취소 사유는 감사 로그에 영구 기록됩니다. (2자 이상)
                    </span>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="예: 금액 계산 오류로 재산정 필요, STAR 요청 정정 등"
              rows={3}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{cancelReason.length} / 500</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCancelTarget(null);
                setCancelReason("");
              }}
            >
              닫기
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-foreground"
              onClick={() => {
                if (cancelTarget && cancelReason.trim().length >= 2) {
                  cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason.trim() });
                }
              }}
              disabled={cancelMutation.isPending || cancelReason.trim().length < 2}
            >
              {cancelMutation.isPending ? "처리 중..." : "확정 취소"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== Delete Dialog ======================== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정산을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <strong>{getStarDisplayName(deleteTarget.star)}</strong>님의{" "}
                  {formatDateRange(new Date(deleteTarget.startDate), new Date(deleteTarget.endDate))} 정산을 삭제합니다.
                  <br />
                  이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
      {/* ======================== Bulk Confirm Dialog ======================== */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "CONFIRM" && "선택한 정산을 일괄 확정하시겠습니까?"}
              {bulkAction === "CANCEL" && "선택한 정산의 확정을 일괄 취소하시겠습니까?"}
              {bulkAction === "DELETE" && "선택한 정산을 영구 삭제하시겠습니까?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedIds.size}건</strong>의 정산에 대해 일괄 처리를 진행합니다.
              {bulkAction === "DELETE" && (
                <>
                  <br />
                  <span className="text-destructive font-medium">이 작업은 되돌릴 수 없습니다.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBulkConfirmOpen(false)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className={bulkAction === "DELETE" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={handleBulkAction}
              disabled={isBulking}
            >
              {isBulking ? "처리 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== Detail Sheet ======================== */}
      <SettlementDetailSheet
        detail={detail}
        detailLoading={detailLoading}
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        onMutate={handleDetailMutate}
        onRequestConfirm={handleRequestConfirm}
        onRequestCancel={handleRequestCancel}
      />
    </div>
  );
}
