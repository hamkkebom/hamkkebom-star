"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  CheckCircle2,
  Download,
  ChevronDown,
  TrendingUp,
  BarChart3,
  Archive,
} from "lucide-react";
import dynamic from "next/dynamic";

const EarningsChart = dynamic(
  () => import("@/components/charts/earnings-chart").then((m) => ({ default: m.EarningsChart })),
  { ssr: false, loading: () => <div className="h-44 sm:h-52 w-full"><Skeleton className="w-full h-full" /></div> }
);

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StatCard } from "@/components/settlement/stat-card";
import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
import { NumberTicker } from "@/components/settlement/number-ticker";
import { formatKRW, formatDateRange } from "@/lib/settlement-utils";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SettlementRow = {
  id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  netAmount?: number;
  taxAmount?: number;
  status: string;
  paymentDate: string | null;
  note: string | null;
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
  startDate: string;
  endDate: string;
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
    } | null;
  }>;
};

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

const STATUS_GLOW_MAP: Record<string, { label: string; variant: GlowVariant; description: string }> = {
  PENDING: { label: "검토 대기", variant: "pending", description: "관리자 검토를 기다리고 있습니다." },
  REVIEW: { label: "검토 중", variant: "pending", description: "관리자가 정산 내역을 검토 중입니다." },
  PROCESSING: { label: "처리 중", variant: "processing", description: "지급 처리 중 · 영업일 기준 3–5일 소요" },
  COMPLETED: { label: "지급 완료", variant: "completed", description: "입금이 완료되었습니다." },
  FAILED: { label: "지급 실패", variant: "failed", description: "지급에 실패했습니다. 관리자에게 문의하세요." },
  CANCELLED: { label: "취소됨", variant: "failed", description: "정산이 취소되었습니다." },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function EarningsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [archiveYear, setArchiveYear] = useState<string>(String(CURRENT_YEAR));

  // 연간 수입 차트 데이터
  type MonthlyEarning = { month: string; amount: number; count: number };
  type AnnualSummary = { total: number; average: number; bestMonth: string | null; bestAmount: number };

  const { data: annualData } = useQuery({
    queryKey: ["annual-earnings"],
    queryFn: async () => {
      const res = await fetch("/api/stars/annual-earnings", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as { data: MonthlyEarning[]; summary: AnnualSummary };
    },
  });

  // 지난 정산 (scope=archive + 연도)
  const { data: archiveData, isLoading: archiveLoading, isError: archiveError } = useQuery({
    queryKey: ["my-settlements", "archive", archiveYear],
    queryFn: async () => {
      const qs = new URLSearchParams({ scope: "archive", page: "1", pageSize: "100" });
      if (archiveYear !== "ALL") qs.set("year", archiveYear);
      const res = await fetch(`/api/settlements?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("지난 정산 내역을 불러오지 못했습니다.");
      return (await res.json()) as SettlementsResponse;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["settlement-detail", expandedId],
    queryFn: async () => {
      const res = await fetch(`/api/settlements/${expandedId}`);
      if (!res.ok) throw new Error("정산 상세를 불러오지 못했습니다.");
      return (await res.json()) as { data: SettlementDetail };
    },
    enabled: !!expandedId,
  });

  const archiveRows = useMemo(() => archiveData?.data ?? [], [archiveData]);

  // 아카이브 집계
  const archiveSummary = useMemo(() => {
    const completed = archiveRows.filter((s) => s.status === "COMPLETED");
    const totalCompleted = completed.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalTax = completed.reduce((sum, s) => sum + Number(s.taxAmount ?? 0), 0);
    const totalNet = completed.reduce((sum, s) => sum + Number(s.netAmount ?? 0), 0);
    return {
      totalCompleted,
      totalTax,
      totalNet,
      completedCount: completed.length,
      totalCount: archiveRows.length,
    };
  }, [archiveRows]);

  // 아카이브 - 월별 그룹핑
  const archiveByMonth = useMemo(() => {
    const map = new Map<string, SettlementRow[]>();
    for (const row of archiveRows) {
      const d = new Date(row.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [archiveRows]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePdfDownload = useCallback((id: string) => {
    window.open(`/api/settlements/${id}/pdf?download=true`, "_blank");
  }, []);

  const detail = detailData?.data;

  // 전체 확정 완료액 (차트용): 진행 중 + 아카이브의 완료 합산은 annual API가 더 정확하므로 별도 계산 생략
  const totalEarnedOverall = annualData?.summary.total ?? archiveSummary.totalCompleted;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">
          월별 정산 내역과 금액을 확인하고, PDF로 다운로드하세요.
        </p>
      </div>

      {/* Stat Card */}
      <div className="grid gap-4 md:grid-cols-1 max-w-xs">
        <StatCard
          title="누적 지급 완료"
          value={totalEarnedOverall}
          suffix="원"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          delay={0}
        />
      </div>

      {/* Annual Earnings Chart */}
      {annualData && annualData.data.some((d) => d.amount > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                월별 수입 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  연간 총 {formatKRW(annualData.summary.total)}
                </div>
                {annualData.summary.average > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                    <DollarSign className="w-3.5 h-3.5" />
                    월 평균 {formatKRW(annualData.summary.average)}
                  </div>
                )}
              </div>
              {/* Chart */}
              <EarningsChart data={annualData.data} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 지난 정산 */}
      <div className="space-y-4">
        {/* 연도 selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">연도</span>
            <Select value={archiveYear} onValueChange={setArchiveYear}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {archiveYear === "ALL" ? "전체 연도" : `${archiveYear}년`} · 총 {archiveSummary.totalCount}건
          </p>
        </div>

        {/* 연간 요약 카드 */}
        {archiveSummary.totalCount > 0 && (
          <Card className="bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-950/20 dark:to-violet-950/20">
            <CardContent className="p-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">지급 완료 합계 (세전)</p>
                <p className="text-base sm:text-lg font-bold tabular-nums mt-0.5">
                  {formatKRW(archiveSummary.totalCompleted)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">원천징수세</p>
                <p className="text-base sm:text-lg font-bold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
                  -{formatKRW(archiveSummary.totalTax)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">실 지급액</p>
                <p className="text-base sm:text-lg font-bold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {formatKRW(archiveSummary.totalNet)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 리스트 */}
        {archiveLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={`arch-sk-${i}`} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : archiveError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
            지난 정산 내역을 불러오지 못했습니다.
          </div>
        ) : archiveRows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Archive className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">
              {archiveYear === "ALL" ? "지난 정산이 없습니다" : `${archiveYear}년 정산 내역이 없습니다`}
            </h3>
            <p className="text-sm text-muted-foreground">
              완료된 정산이 이곳에 보관됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {archiveByMonth.map(([monthKey, monthRows]) => {
              const [y, m] = monthKey.split("-");
              return (
                <div key={monthKey} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1 z-[1]">
                    {y}년 {Number(m)}월 <span className="text-xs font-normal ml-1">({monthRows.length}건)</span>
                  </h4>
                  <div className="space-y-2">
                    {monthRows.map((settlement, index) => (
                      <SettlementRowCard
                        key={settlement.id}
                        settlement={settlement}
                        index={index}
                        expanded={expandedId === settlement.id}
                        onToggle={handleToggle}
                        onPdf={handlePdfDownload}
                        detail={detail}
                        detailLoading={detailLoading}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settlement Row Card (재사용)
// ---------------------------------------------------------------------------

function SettlementRowCard({
  settlement,
  index,
  expanded,
  onToggle,
  onPdf,
  detail,
  detailLoading,
}: {
  settlement: SettlementRow;
  index: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  onPdf: (id: string) => void;
  detail?: SettlementDetail;
  detailLoading: boolean;
}) {
  const statusInfo = STATUS_GLOW_MAP[settlement.status];
  return (
    <AnimatedCard delay={index * 0.03}>
      <button
        type="button"
        className="w-full text-left active:scale-[0.98] transition-all duration-200"
        onClick={() => onToggle(settlement.id)}
      >
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <p className="font-semibold">
                {formatDateRange(new Date(settlement.startDate), new Date(settlement.endDate))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                항목 {settlement._count.items}건
                {settlement.paymentDate &&
                  ` · 지급일 ${new Intl.DateTimeFormat("ko-KR").format(new Date(settlement.paymentDate))}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NumberTicker
              value={Number(settlement.totalAmount)}
              suffix="원"
              className="text-sm sm:text-lg font-bold tabular-nums"
            />
            <GlowBadge
              label={statusInfo?.label ?? settlement.status}
              variant={statusInfo?.variant ?? "pending"}
            />
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </button>

      {/* Status description banner */}
      {statusInfo?.description && (settlement.status === "PROCESSING" || settlement.status === "FAILED") && (
        <div
          className={`px-4 pb-2 text-xs ${
            settlement.status === "FAILED" ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
          }`}
        >
          {statusInfo.description}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "spring", stiffness: 400, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="p-4 space-y-3">
              {detailLoading || !detail || detail.id !== settlement.id ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  {detail.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.description ??
                            (item.itemType === "AI_TOOL_SUPPORT"
                              ? "AI 툴 지원비"
                              : item.submission?.versionTitle ?? "작품료")}
                        </p>
                        {item.submission && (
                          <p className="text-xs text-muted-foreground">
                            v{item.submission.version} ·{" "}
                            {new Intl.DateTimeFormat("ko-KR").format(new Date(item.submission.createdAt))}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          {formatKRW(Number(item.finalAmount))}
                        </p>
                        {item.adjustedAmount !== null &&
                          Number(item.adjustedAmount) !== Number(item.baseAmount) && (
                            <p className="text-xs text-muted-foreground line-through tabular-nums">
                              {formatKRW(Number(item.baseAmount))}
                            </p>
                          )}
                      </div>
                    </div>
                  ))}

                  {detail.note && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      메모: {detail.note}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto mt-2 gap-2 rounded-xl font-bold select-none active:scale-95 transition-all text-xs sm:text-sm h-11 sm:h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPdf(settlement.id);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    지급내역서 PDF 다운로드
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedCard>
  );
}
