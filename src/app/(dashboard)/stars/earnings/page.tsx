"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SettlementRow = {
  id: string;
  year: number;
  month: number;
  totalAmount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  _count: { items: number };
};

type SettlementsResponse = {
  data: SettlementRow[];
  total: number;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기중", variant: "secondary" },
  PROCESSING: { label: "처리중", variant: "default" },
  COMPLETED: { label: "완료", variant: "outline" },
  CANCELLED: { label: "취소됨", variant: "destructive" },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EarningsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements?page=1&pageSize=50", { cache: "no-store" });
      if (!res.ok) throw new Error("정산 내역을 불러오지 못했습니다.");
      return (await res.json()) as SettlementsResponse;
    },
  });

  const totalEarned = data?.data
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0) ?? 0;

  const pendingAmount = data?.data
    .filter((s) => s.status === "PENDING" || s.status === "PROCESSING")
    .reduce((sum, s) => sum + Number(s.totalAmount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">정산 내역</h1>
        <p className="text-sm text-muted-foreground">월별 정산 내역과 금액을 확인하세요.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 정산 완료</CardDescription>
            <CardTitle className="text-2xl">{isLoading ? "..." : formatAmount(totalEarned)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>정산 대기 중</CardDescription>
            <CardTitle className="text-2xl">{isLoading ? "..." : formatAmount(pendingAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>정산 건수</CardDescription>
            <CardTitle className="text-2xl">{isLoading ? "..." : `${data?.total ?? 0}건`}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 정산 목록 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={`earn-sk-${i}`} className="h-16 w-full" />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "정산 내역을 불러오지 못했습니다."}
        </div>
      ) : !data?.data.length ? (
        <div className="rounded-xl border border-dashed px-4 py-14 text-center">
          <h3 className="mb-1 text-lg font-semibold">정산 내역이 없습니다</h3>
          <p className="text-sm text-muted-foreground">승인된 제출물이 있으면 정산이 생성됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    {settlement.year}년 {String(settlement.month).padStart(2, "0")}월
                  </p>
                  <p className="text-xs text-muted-foreground">
                    제출물 {settlement._count.items}건
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold tabular-nums">
                    {formatAmount(Number(settlement.totalAmount))}
                  </span>
                  <Badge variant={statusMap[settlement.status]?.variant ?? "secondary"}>
                    {statusMap[settlement.status]?.label ?? settlement.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
