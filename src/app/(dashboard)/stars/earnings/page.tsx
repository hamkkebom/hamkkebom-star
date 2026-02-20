"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  ChevronDown,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { StatCard } from "@/components/settlement/stat-card";
import { AnimatedCard } from "@/components/settlement/animated-card";
import { GlowBadge } from "@/components/settlement/glow-badge";
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
    } | null;
  }>;
};

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

const STATUS_GLOW_MAP: Record<string, { label: string; variant: GlowVariant }> = {
  PENDING: { label: "대기중", variant: "pending" },
  PROCESSING: { label: "처리중", variant: "processing" },
  COMPLETED: { label: "완료", variant: "completed" },
  FAILED: { label: "실패", variant: "failed" },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function EarningsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements?page=1&pageSize=50", { cache: "no-store" });
      if (!res.ok) throw new Error("정산 내역을 불러오지 못했습니다.");
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

  const rows = data?.data ?? [];
  const totalEarned = rows
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const pendingAmount = rows
    .filter((s) => s.status === "PENDING" || s.status === "PROCESSING")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const totalCount = data?.total ?? 0;

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handlePdfDownload = useCallback((id: string) => {
    window.open(`/api/settlements/${id}/pdf?download=true`, "_blank");
  }, []);

  const detail = detailData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정산 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">
          월별 정산 내역과 금액을 확인하고, PDF로 다운로드하세요.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="총 정산 완료"
          value={totalEarned}
          suffix="원"
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          delay={0}
        />
        <StatCard
          title="정산 대기중"
          value={pendingAmount}
          suffix="원"
          icon={Clock}
          iconColor="text-amber-500"
          delay={0.1}
        />
        <StatCard
          title="정산 건수"
          value={totalCount}
          suffix="건"
          icon={FileText}
          iconColor="text-violet-500"
          delay={0.2}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`earn-sk-${i}`} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "정산 내역을 불러오지 못했습니다."}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">아직 정산 내역이 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            영상이 승인되면 정산이 자동으로 생성됩니다.
            <br />
            승인된 영상이 있으면 다음 정산 주기에 반영됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((settlement, index) => {
            const isExpanded = expandedId === settlement.id;
            return (
              <AnimatedCard key={settlement.id} delay={index * 0.04}>
                {/* Row */}
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => handleToggle(settlement.id)}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <p className="font-semibold">
                          {settlement.year}년{" "}
                          {String(settlement.month).padStart(2, "0")}월
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
                        className="text-lg font-bold tabular-nums"
                      />
                      <GlowBadge
                        label={STATUS_GLOW_MAP[settlement.status]?.label ?? settlement.status}
                        variant={STATUS_GLOW_MAP[settlement.status]?.variant ?? "pending"}
                      />
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
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
                            {/* Items */}
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
                                      v{item.submission.version} &middot;{" "}
                                      {new Intl.DateTimeFormat("ko-KR").format(
                                        new Date(item.submission.createdAt),
                                      )}
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

                            {/* Note */}
                            {detail.note && (
                              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                메모: {detail.note}
                              </p>
                            )}

                            {/* PDF Download */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePdfDownload(settlement.id);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
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
          })}
        </div>
      )}
    </div>
  );
}
