"use client";

import { useState, useCallback, useMemo } from "react";
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
  ChevronDown,
  Plus,
  Clock,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import { StatCard } from "@/components/settlement/stat-card";
import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
import { ConfettiTrigger } from "@/components/settlement/confetti-trigger";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { formatKRW, formatDateRange, getDefaultDateRange } from "@/lib/settlement-utils";
import { SettlementDetailSheet, type SettlementDetail } from "@/components/admin/settlement-detail-sheet";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementRow = {
  id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  paymentDate: string | null;
  note: string | null;
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
  };
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기중" },
  { value: "PROCESSING", label: "처리중" },
  { value: "COMPLETED", label: "완료" },
] as const;

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

const STATUS_GLOW_MAP: Record<string, { label: string; variant: GlowVariant }> = {
  PENDING: { label: "대기중", variant: "pending" },
  PROCESSING: { label: "처리중", variant: "processing" },
  COMPLETED: { label: "완료", variant: "completed" },
  FAILED: { label: "실패", variant: "failed" },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

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
  const now = new Date();

  // Filter
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

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

  // StatCard expand
  const [expandedCard, setExpandedCard] = useState<"pending" | "processing" | null>(null);

  // Query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (filterDateRange?.from) params.set("startDate", filterDateRange.from.toISOString().slice(0, 10));
    if (filterDateRange?.to) params.set("endDate", filterDateRange.to.toISOString().slice(0, 10));
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    return params.toString();
  }, [filterDateRange, filterStatus]);

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
      setGenerateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "정산 생성에 실패했습니다."),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settlements/${id}/complete`, { method: "PATCH" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 확정에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("정산이 확정되었습니다!");
      setShowConfetti(true);
      setConfirmTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 확정에 실패했습니다.");
      setConfirmTarget(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/settlements/${id}/cancel`, { method: "PATCH" });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 확정 취소에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success("정산 확정이 취소되었습니다. (대기 상태로 변경됨)");
      setCancelTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 확정 취소에 실패했습니다.");
      setCancelTarget(null);
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

  const rows = settlementsData?.data ?? [];
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const processingCount = rows.filter((r) => r.status === "PROCESSING").length;
  const completedCount = rows.filter((r) => r.status === "COMPLETED").length;
  const totalSum = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
  const uniqueStars = new Set(rows.map((r) => r.star.id)).size;

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
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="gap-1.5">
            <FileText className="h-4 w-4" />
            개요
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
        <TabsContent value="overview" className="space-y-6">
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

              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExcelDownload}
                  disabled={excelDownloading || rows.length === 0}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  {selectedIds.size > 0 ? `${selectedIds.size}건 엑셀` : "전체 엑셀"}
                </Button>
                <Button onClick={() => setGenerateOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  정산 생성
                </Button>
              </div>
            </div>
          </AnimatedCard>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`sk-${i}`} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
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
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>월별 정산 생성</DialogTitle>
            <DialogDescription>
              해당 기간의 승인된 제출물을 기반으로 정산을 자동 생성합니다.
              <br />
              <span className="text-xs text-muted-foreground">
                ※ 이미 대기중인 정산은 재생성됩니다. 확정된 정산은 유지됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>
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
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending || !genDateRange?.from} className="mt-2 gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {generateMutation.isPending ? "생성 중..." : "정산 생성"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ======================== Confirm Dialog ======================== */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정산을 확정하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && (
                <>
                  <strong>{getStarDisplayName(confirmTarget.star)}</strong>님의{" "}
                  {formatDateRange(new Date(confirmTarget.startDate), new Date(confirmTarget.endDate))} 정산(
                  {formatAmount(Number(confirmTarget.totalAmount))})을 확정합니다.
                  <br />
                  확정 후에는 삭제하거나 재생성할 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmTarget && completeMutation.mutate(confirmTarget.id)}>
              확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ======================== Cancel Dialog ======================== */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              정산 확정을 취소하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  <strong className="text-foreground">{getStarDisplayName(cancelTarget.star)}</strong>님의{" "}
                  {formatDateRange(new Date(cancelTarget.startDate), new Date(cancelTarget.endDate))} 정산의 확정 상태를 해제하고 다시 대기 상태로 변경합니다.
                  <br />
                  <br />
                  대기 상태로 돌아가면 내역 수정이 다시 가능해집니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelTarget(null)}>닫기</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
              }}
              disabled={cancelMutation.isPending}
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
