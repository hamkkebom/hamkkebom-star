"use client";

import { useQuery } from "@tanstack/react-query";
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
import Link from "next/link";

type StarRow = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  role: string;
  specialty: string | null;
  baseRate: number | null;
  createdAt: string;
};

type StarsResponse = {
  data: StarRow[];
  total: number;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(dateStr));
}

export default function AdminStarsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stars"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stars?page=1&pageSize=50", { cache: "no-store" });
      if (!res.ok) throw new Error("STAR 목록을 불러오지 못했습니다.");
      return (await res.json()) as StarsResponse;
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">STAR 관리</h1>
        <p className="text-sm text-muted-foreground">STAR 회원 목록을 관리하고 단가를 설정하세요. ({data?.total ?? 0}명)</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={`star-sk-${i}`} className="h-12 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>전문분야</TableHead>
                  <TableHead>기본단가</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      등록된 STAR가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.chineseName || row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.specialty ?? "-"}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.baseRate ? formatAmount(Number(row.baseRate)) : "-"}
                      </TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/stars/${row.id}`}>
                          <Button variant="outline" size="sm">상세</Button>
                        </Link>
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
