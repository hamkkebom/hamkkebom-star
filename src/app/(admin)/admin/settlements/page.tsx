"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SettlementRow = {
  id: string;
  year: number;
  month: number;
  totalAmount: number;
  status: string;
  star: { id: string; name: string; email: string };
  _count: { items: number };
};

type SettlementsResponse = {
  data: SettlementRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기중", variant: "secondary" },
  PROCESSING: { label: "처리중", variant: "default" },
  COMPLETED: { label: "완료", variant: "outline" },
  CANCELLED: { label: "취소됨", variant: "destructive" },
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

export default function AdminSettlementsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements?page=1&pageSize=50", { cache: "no-store" });
      if (!res.ok) throw new Error("정산 목록을 불러오지 못했습니다.");
      return (await res.json()) as SettlementsResponse;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settlements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: { message?: string } };
        throw new Error(err.error?.message ?? "정산 생성에 실패했습니다.");
      }
    },
    onSuccess: async () => {
      toast.success(`${year}년 ${month}월 정산이 생성되었습니다.`);
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 생성에 실패했습니다.");
    },
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
      toast.success("정산이 확정되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["admin-settlements"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "정산 확정에 실패했습니다.");
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">정산 관리</h1>
          <p className="text-sm text-muted-foreground">월별 정산을 생성하고 확정하세요.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>정산 생성</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>월별 정산 생성</DialogTitle>
              <DialogDescription>해당 월의 승인된 제출물을 기반으로 정산을 자동 생성합니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>연도</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>월</Label>
                <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
              </div>
            </div>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="mt-2"
            >
              {generateMutation.isPending ? "생성 중..." : "생성"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={`set-sk-${i}`} className="h-12 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>연월</TableHead>
                  <TableHead>STAR</TableHead>
                  <TableHead>제출물</TableHead>
                  <TableHead>총액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      정산 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.year}년 {String(row.month).padStart(2, "0")}월</TableCell>
                      <TableCell>{row.star.name}</TableCell>
                      <TableCell>{row._count.items}건</TableCell>
                      <TableCell className="tabular-nums">{formatAmount(Number(row.totalAmount))}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[row.status]?.variant ?? "secondary"}>
                          {statusMap[row.status]?.label ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(row.status === "PENDING" || row.status === "PROCESSING") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => completeMutation.mutate(row.id)}
                            disabled={completeMutation.isPending}
                          >
                            확정
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
