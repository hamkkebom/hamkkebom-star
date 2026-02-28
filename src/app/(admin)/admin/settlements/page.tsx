"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Users,
  FileText,
  CheckCircle2,
  Calendar,
  Download,
  Settings,
  Trash2,
  AlertTriangle,
  Film,
  ChevronRight,
  Plus,
  Clock,
  Pencil,
  Save,
  X,
  ExternalLink,
  Tag,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { StatCard } from "@/components/settlement/stat-card";
import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
import { ConfettiTrigger } from "@/components/settlement/confetti-trigger";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { formatKRW } from "@/lib/settlement-utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementRow = {
  id: string;
  year: number;
  month: number;
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

type SettlementDetail = {
  id: string;
  year: number;
  month: number;
  totalAmount: number;
  status: string;
  paymentDate: string | null;
  note: string | null;
  star: {
    id: string;
    name: string;
    email: string;
    baseRate: number | null;
    idNumber: string | null;
    bankName: string | null;
    bankAccount: string | null;
  };
  items: Array<{
    id: string;
    baseAmount: number;
    adjustedAmount: number | null;
    finalAmount: number;
    description: string | null;
    itemType: string;
    submission: {
      id: string;
      versionTitle: string | null;
      version: string;
      status: string;
      createdAt: string;
      video: {
        id: string;
        title: string;
        customRate: number | null;
      } | null;
    } | null;
  }>;
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
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Generate dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);

  // Confirm / Delete / Cancel
  const [confirmTarget, setConfirmTarget] = useState<SettlementRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SettlementRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SettlementRow | null>(null);

  // Detail Sheet
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailNoteEdit, setDetailNoteEdit] = useState(false);
  const [detailNoteValue, setDetailNoteValue] = useState("");

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Settings edit
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Query string
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (filterYear !== "ALL") params.set("year", filterYear);
    if (filterMonth !== "ALL") params.set("month", filterMonth);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    return params.toString();
  }, [filterYear, filterMonth, filterStatus]);

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

  const { data: detailData, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
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
        body: JSON.stringify({ year: genYear, month: genMonth }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 생성에 실패했습니다.");
      }
      return (await res.json()) as GenerateResponse;
    },
    onSuccess: async (result) => {
      const createdCount = result.data?.length ?? 0;
      toast.success(`${genYear}년 ${genMonth}월 정산이 ${createdCount}건 생성되었습니다.`);
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

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("메모 저장에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("메모가 저장되었습니다.");
      setDetailNoteEdit(false);
      await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "메모 저장에 실패했습니다."),
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

  const updateVideoRateMutation = useMutation({
    mutationFn: async ({ videoId, customRate }: { videoId: string; customRate: number | null }) => {
      const res = await fetch(`/api/videos/${videoId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customRate }),
      });
      if (!res.ok) throw new Error("영상 단가 설정에 실패했습니다.");
    },
    onSuccess: async () => {
      toast.success("영상 단가가 저장되었습니다. 정산을 재생성하면 반영됩니다.");
      if (detailId) await queryClient.invalidateQueries({ queryKey: ["settlement-detail", detailId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "영상 단가 설정에 실패했습니다."),
  });

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const rows = settlementsData?.data ?? [];
  const pendingCount = rows.filter((r) => r.status === "PENDING" || r.status === "PROCESSING").length;
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
    setDetailNoteEdit(false);
  }, []);

  const handlePdfDownload = useCallback((id: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `/api/settlements/${id}/pdf?download=true`;
    document.body.appendChild(iframe);
    // 다운로드 시작 후 정리
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 30000);
  }, []);

  const handleStartNoteEdit = useCallback(() => {
    setDetailNoteValue(detail?.note ?? "");
    setDetailNoteEdit(true);
  }, [detail?.note]);

  const handleSaveNote = useCallback(() => {
    if (detailId) updateNoteMutation.mutate({ id: detailId, note: detailNoteValue });
  }, [detailId, detailNoteValue, updateNoteMutation]);

  const handleStartConfigEdit = useCallback((key: string, currentValue: string) => {
    setEditingKey(key);
    setEditValue(currentValue);
  }, []);

  const handleSaveConfig = useCallback(() => {
    if (editingKey) updateConfigMutation.mutate({ key: editingKey, value: editValue });
  }, [editingKey, editValue, updateConfigMutation]);

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="총 정산액" value={totalSum} suffix="원" icon={DollarSign} iconColor="text-emerald-500" delay={0} />
            <StatCard title="대기/처리중" value={pendingCount} suffix="건" icon={Clock} iconColor="text-amber-500" delay={0.1} />
            <StatCard title="확정 완료" value={completedCount} suffix="건" icon={CheckCircle2} iconColor="text-cyan-500" delay={0.2} />
            <StatCard title="참여 STAR" value={uniqueStars} suffix="명" icon={Users} iconColor="text-violet-500" delay={0.3} />
          </div>

          {/* Filter Bar */}
          <AnimatedCard delay={0.15}>
            <div className="flex flex-wrap items-center gap-3 p-4">
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 연도</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="월" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 월</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              <div className="ml-auto">
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
                      <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
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
                          <TableCell className="font-medium">
                            {row.year}년 {String(row.month).padStart(2, "0")}월
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
                              <Button variant="ghost" size="sm" onClick={() => handlePdfDownload(row.id)} title="PDF 다운로드">
                                <Download className="h-4 w-4" />
                              </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>월별 정산 생성</DialogTitle>
            <DialogDescription>
              해당 월의 승인된 제출물을 기반으로 정산을 자동 생성합니다.
              <br />
              <span className="text-xs text-muted-foreground">
                ※ 이미 대기중인 정산은 재생성됩니다. 확정된 정산은 유지됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>연도</Label>
              <Input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>월</Label>
              <Input type="number" min={1} max={12} value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="mt-2 gap-1.5">
            <Calendar className="h-4 w-4" />
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
                  {confirmTarget.year}년 {String(confirmTarget.month).padStart(2, "0")}월 정산(
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
                  {cancelTarget.year}년 {cancelTarget.month}월 정산의 확정 상태를 해제하고 다시 대기 상태로 변경합니다.
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
                  {deleteTarget.year}년 {String(deleteTarget.month).padStart(2, "0")}월 정산을 삭제합니다.
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
      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {detail ? `${detail.year}년 ${String(detail.month).padStart(2, "0")}월 정산` : "정산 상세"}
            </SheetTitle>
          </SheetHeader>

          {detailLoading || !detail ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              {/* STAR Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">STAR 정보</h4>
                <Card>
                  <CardContent className="p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">이름</span>
                      <span className="font-medium">{detail.star.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">이메일</span>
                      <span>{detail.star.email}</span>
                    </div>
                    {detail.star.idNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">주민번호</span>
                        <span className="font-mono text-xs">{detail.star.idNumber}</span>
                      </div>
                    )}
                    {detail.star.bankName && detail.star.bankAccount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">계좌</span>
                        <span>{detail.star.bankName} {detail.star.bankAccount}</span>
                      </div>
                    )}
                    {detail.star.baseRate !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">기본 단가</span>
                        <span className="tabular-nums">{formatKRW(Number(detail.star.baseRate))}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">정산 요약</h4>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <GlowBadge
                        label={STATUS_GLOW_MAP[detail.status]?.label ?? detail.status}
                        variant={STATUS_GLOW_MAP[detail.status]?.variant ?? "pending"}
                        size="md"
                      />
                      <NumberTicker value={Number(detail.totalAmount)} suffix="원" className="text-xl font-bold" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {detail.items.length}개 항목 &middot;{" "}
                      {detail.paymentDate
                        ? `지급일: ${new Intl.DateTimeFormat("ko-KR").format(new Date(detail.paymentDate))}`
                        : "지급일 미정"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">정산 항목 ({detail.items.length})</h4>
                <div className="space-y-2">
                  {detail.items.map((item) => {
                    const videoTitle = item.submission?.video?.title;
                    const videoId = item.submission?.video?.id;
                    const videoCustomRate = item.submission?.video?.customRate;
                    const submissionId = item.submission?.id;
                    const isClickable = !!submissionId;
                    const hasCustomRate = videoCustomRate !== null && videoCustomRate !== undefined;
                    const displayTitle = item.description
                      ?? (item.itemType === "AI_TOOL_SUPPORT"
                        ? "AI 툴 지원비"
                        : videoTitle ?? item.submission?.versionTitle ?? "작품료");

                    return (
                      <Card
                        key={item.id}
                        className={isClickable ? "transition-all hover:border-violet-400/60 hover:shadow-md hover:shadow-violet-500/5 group" : ""}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {item.itemType !== "AI_TOOL_SUPPORT" && (
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                  <Film className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p
                                    className={`text-sm font-medium truncate ${isClickable ? "cursor-pointer group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" : ""}`}
                                    onClick={() => {
                                      if (isClickable) {
                                        window.open(`/admin/reviews/${submissionId}`, "_blank");
                                      }
                                    }}
                                  >
                                    {displayTitle}
                                  </p>
                                  {isClickable && (
                                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {item.submission && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.submission.version} · {new Intl.DateTimeFormat("ko-KR").format(new Date(item.submission.createdAt))}
                                    </p>
                                  )}
                                  {hasCustomRate && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
                                      <Tag className="h-2.5 w-2.5" />
                                      영상 단가
                                    </span>
                                  )}
                                </div>
                                {/* 영상 단가 설정 UI */}
                                {videoId && item.itemType !== "AI_TOOL_SUPPORT" && (
                                  <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      type="number"
                                      placeholder="영상 단가 (미설정 시 기본)"
                                      defaultValue={hasCustomRate ? Number(videoCustomRate) : ""}
                                      className="h-7 text-xs w-[160px]"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          const val = (e.target as HTMLInputElement).value;
                                          updateVideoRateMutation.mutate({
                                            videoId,
                                            customRate: val ? Number(val) : null,
                                          });
                                        }
                                      }}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        const val = input?.value;
                                        updateVideoRateMutation.mutate({
                                          videoId,
                                          customRate: val ? Number(val) : null,
                                        });
                                      }}
                                      disabled={updateVideoRateMutation.isPending}
                                    >
                                      <Save className="h-3 w-3 mr-1" />
                                      저장
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="text-sm font-semibold tabular-nums">{formatKRW(Number(item.finalAmount))}</p>
                              {item.adjustedAmount !== null && Number(item.adjustedAmount) !== Number(item.baseAmount) && (
                                <p className="text-xs text-muted-foreground line-through tabular-nums">{formatKRW(Number(item.baseAmount))}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">메모</h4>
                  {!detailNoteEdit && (
                    <Button variant="ghost" size="sm" onClick={handleStartNoteEdit}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {detailNoteEdit ? (
                  <div className="space-y-2">
                    <Textarea
                      value={detailNoteValue}
                      onChange={(e) => setDetailNoteValue(e.target.value)}
                      placeholder="메모를 입력하세요..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNote} disabled={updateNoteMutation.isPending}>
                        {updateNoteMutation.isPending ? "저장 중..." : "저장"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDetailNoteEdit(false)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{detail.note || "메모가 없습니다."}</p>
                )}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handlePdfDownload(detail.id)}>
                  <Download className="h-4 w-4" />
                  PDF 다운로드
                </Button>
                {(detail.status === "PENDING" || detail.status === "PROCESSING") && (
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      const row = rows.find((r) => r.id === detail.id);
                      if (row) setConfirmTarget(row);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    확정
                  </Button>
                )}
                {detail.status === "COMPLETED" && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      const row = rows.find((r) => r.id === detail.id);
                      if (row) setCancelTarget(row);
                    }}
                  >
                    <Undo2 className="h-4 w-4" />
                    확정 취소
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
