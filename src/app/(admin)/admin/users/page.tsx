"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, Users } from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isApproved: boolean;
  createdAt: string;
};

type UsersResponse = {
  data: UserRow[];
  total: number;
  page: number;
  totalPages: number;
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const queryKey = ["admin-users", search, filter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      if (search) params.set("search", search);
      if (filter === "approved") params.set("approved", "true");
      if (filter === "pending") params.set("approved", "false");
      const res = await fetch(`/api/admin/users?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("사용자 목록을 불러오지 못했습니다.");
      return (await res.json()) as UsersResponse;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      userId,
      approved,
    }: {
      userId: string;
      approved: boolean;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (!res.ok) throw new Error("처리에 실패했습니다.");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        variables.approved ? "사용자를 승인했습니다." : "사용자를 반려했습니다."
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rows = data?.data ?? [];
  const pendingCount = rows.filter((r) => !r.isApproved).length;
  const approvedCount = rows.filter((r) => r.isApproved).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">모든 계정 관리</h1>
        <p className="text-sm text-muted-foreground">
          가입한 사용자를 확인하고 승인 또는 반려하세요. (총{" "}
          {data?.total ?? 0}명)
        </p>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={`cursor-pointer transition-colors ${filter === "all" ? "border-primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">전체</p>
              <p className="text-xl font-bold">{data?.total ?? 0}명</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${filter === "pending" ? "border-orange-500" : ""}`}
          onClick={() => setFilter("pending")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">승인 대기</p>
              <p className="text-xl font-bold text-orange-500">
                {filter === "all" ? pendingCount : filter === "pending" ? (data?.total ?? 0) : "—"}명
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${filter === "approved" ? "border-emerald-500" : ""}`}
          onClick={() => setFilter("approved")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">승인 완료</p>
              <p className="text-xl font-bold text-emerald-500">
                {filter === "all" ? approvedCount : filter === "approved" ? (data?.total ?? 0) : "—"}명
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="이름 또는 이메일로 검색..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`user-sk-${i}`} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>한문이름</TableHead>
                  <TableHead>이름(한글)</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead className="text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {search
                        ? "검색 결과가 없습니다."
                        : "가입한 사용자가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.chineseName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.role === "ADMIN" ? "default" : "secondary"
                          }
                        >
                          {row.role === "ADMIN" ? "관리자" : row.role === "STAR" ? "STAR" : row.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {row.isApproved ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            승인됨
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-orange-500/50 text-orange-500"
                          >
                            대기중
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.role !== "ADMIN" && (
                          <div className="flex justify-end gap-1">
                            {!row.isApproved ? (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                disabled={approveMutation.isPending}
                                onClick={() =>
                                  approveMutation.mutate({
                                    userId: row.id,
                                    approved: true,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                승인
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                                disabled={approveMutation.isPending}
                                onClick={() =>
                                  approveMutation.mutate({
                                    userId: row.id,
                                    approved: false,
                                  })
                                }
                              >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                반려
                              </Button>
                            )}
                          </div>
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
