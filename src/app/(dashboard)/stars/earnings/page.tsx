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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h3 className="mb-1 text-lg font-semibold">아직 정산 내역이 없습니다</h3>
          <p className="text-sm text-muted-foreground">영상이 승인되면 정산이 자동으로 생성됩니다.<br/>승인된 영상이 있으면 다음 정산 주기에 반영됩니다.</p>
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
