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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Search, Users,
  ChevronLeft, ChevronRight, Mail, Phone, CreditCard, ShieldCheck,
  Eye, EyeOff, Building
} from "lucide-react";
import { maskIdNumber } from "@/lib/settlement-utils";
import { UserSwipeDeck, SwipeableUser } from "@/components/admin/user-swipe-deck";

type UserRow = {
  id: string;
  name: string;
  chineseName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isApproved: boolean;
  createdAt: string;
  idNumber?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  avatarUrl?: string | null;
};

type UsersResponse = {
  data: UserRow[];
  total: number;
  page: number;
  pageSize: number;
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
  const [page, setPage] = useState(1);
  const pageSize = 50;



  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // 검색이나 필터 변경 시 페이지 초기화
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };
  const handleFilterChange = (newFilter: "all" | "approved" | "pending") => {
    setFilter(newFilter);
    setPage(1);
  };

  const queryKey = ["admin-users", search, filter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });
      if (search) params.set("search", search);
      if (filter === "approved") params.set("approved", "true");
      if (filter === "pending") params.set("approved", "false");
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
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
      rejectionReason,
    }: {
      userId: string;
      approved: boolean;
      rejectionReason?: string;
    }) => {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved, rejectionReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error?.message ?? "처리에 실패했습니다.");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      // 상세 뷰가 열려있고 대상 유저의 상태가 바뀌었다면 상세 정보도 갱신
      if (selectedUser?.id === variables.userId) {
        setSelectedUser(prev => prev ? { ...prev, isApproved: variables.approved } : null);
      }
      toast.success(
        variables.approved ? "사용자를 승인했습니다." : "사용자를 반려했습니다."
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleRowClick = (user: UserRow) => {
    setSelectedUser(user);
    setShowSensitive(false);
  };

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  // 전체 통계를 알 수가 없으므로 헤더에서는 전체 카운트로 통일(API 개선 전까지)
  const totalCount = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">모든 계정 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          가입한 스타 또는 어드민을 조회하고 정보를 관리하세요. (총 {totalCount}명 검색됨)
        </p>
      </div>

      {/* 요약 카드 (클릭 필터) */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === "all" ? "ring-2 ring-primary border-transparent" : ""}`}
          onClick={() => handleFilterChange("all")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">상태 필터</p>
              <p className="text-xl font-bold">전체 보기</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === "pending" ? "ring-2 ring-orange-500 border-transparent" : ""}`}
          onClick={() => handleFilterChange("pending")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-orange-500/10 rounded-full">
              <XCircle className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">상태 필터</p>
              <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
                대기중인 계정 보기
              </p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${filter === "approved" ? "ring-2 ring-emerald-500 border-transparent" : ""}`}
          onClick={() => handleFilterChange("approved")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-emerald-500/10 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">상태 필터</p>
              <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-400">
                승인완료 계정 보기
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
          className="pl-9 bg-white dark:bg-slate-950 shadow-sm"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* 데스크톱/모바일 컨텐츠 분기 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={`user-sk-${i}`} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* 모바일 스와이프 덱 (대기 상태일 때만 표시) */}
          <div className="block md:hidden">
            {filter === "pending" ? (
              <UserSwipeDeck
                users={rows.map(r => ({ ...r, createdAt: formatDate(r.createdAt) } as SwipeableUser))}
                onApprove={(id) => approveMutation.mutate({ userId: id, approved: true })}
                onReject={() => toast.info("모바일에서는 상세 보기 후 권한을 관리하세요.")} // For safety, we can just reject or ask for detail
                onViewDetail={(u) => {
                  const matched = rows.find(r => r.id === u.id);
                  if (matched) handleRowClick(matched);
                }}
              />
            ) : (
              // 리스트 뷰 (모바일 명함형 리스트)
              <div className="flex flex-col gap-3 mt-4">
                {rows.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground bg-slate-50/20 dark:bg-slate-900/10 rounded-2xl border border-dashed">
                    {search ? "검색 결과가 없습니다." : "가입한 사용자가 없습니다."}
                  </div>
                ) : (
                  rows.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-transform"
                    >
                      <Avatar className="h-12 w-12 border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                        <AvatarImage src={row.avatarUrl || ""} />
                        <AvatarFallback className="text-xs font-bold bg-slate-200 dark:bg-slate-700">{row.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{row.name}</h3>
                          {row.isApproved && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{row.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={
                          row.isApproved
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-none shadow-none text-[10px]"
                            : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-none shadow-none text-[10px]"
                        }>
                          {row.isApproved ? "승인됨" : "대기중"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden md:block">
            <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="pl-6 font-semibold">이름(한글)</TableHead>
                      <TableHead className="font-semibold">이름(중문)</TableHead>
                      <TableHead className="font-semibold">이메일</TableHead>
                      <TableHead className="font-semibold">역할</TableHead>
                      <TableHead className="font-semibold">상태</TableHead>
                      <TableHead className="font-semibold">가입일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-16 text-center text-muted-foreground bg-slate-50/20 dark:bg-slate-900/10"
                        >
                          {search
                            ? "검색 결과가 없습니다."
                            : "가입한 사용자가 없습니다."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 group active:bg-slate-100 dark:active:bg-slate-800"
                          onClick={() => handleRowClick(row)}
                        >
                          <TableCell className="pl-6 font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400 font-medium">
                            {row.chineseName ?? "—"}
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400">
                            {row.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={row.role === "ADMIN" ? "default" : "secondary"}
                              className={row.role === "ADMIN" ? "bg-slate-800" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}
                            >
                              {row.role === "ADMIN" ? "관리자" : row.role === "STAR" ? "STAR" : row.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.isApproved ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 border-none shadow-none font-bold">
                                승인됨
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 font-bold"
                              >
                                대기중
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-medium">
                            {formatDate(row.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{page}</span> / {totalPages} 페이지
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 px-2 lg:px-3"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1 hidden lg:block" />
                        이전
                      </Button>

                      <div className="flex items-center gap-1 mx-2">
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                          // 간단한 페이지네이션 표시 로직
                          let pNum = page;
                          if (totalPages <= 5) pNum = i + 1;
                          else if (page <= 3) pNum = i + 1;
                          else if (page >= totalPages - 2) pNum = totalPages - 4 + i;
                          else pNum = page - 2 + i;

                          return (
                            <button
                              key={pNum}
                              onClick={() => setPage(pNum)}
                              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === pNum
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                              {pNum}
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 px-2 lg:px-3"
                      >
                        다음
                        <ChevronRight className="h-4 w-4 ml-1 hidden lg:block" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 프리미엄 계정 상세 뷰 (Sheet) */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col gap-0 shadow-2xl">
          {selectedUser && (
            <>
              {/* Header Gradient Background */}
              <div className="relative h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 flex items-end">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                {/* 닫기 버튼용 여백 보존 */}
              </div>

              {/* Profile Overview */}
              <div className="px-6 pb-6 relative z-10 flex flex-col items-center -mt-12 mb-2">
                <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-950 shadow-xl bg-white dark:bg-slate-900">
                  <AvatarImage src={selectedUser.avatarUrl || ""} className="object-cover" />
                  <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-600 dark:text-slate-300">
                    {selectedUser.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-4 text-center space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex justify-center items-center gap-2">
                    {selectedUser.name}
                    {selectedUser.isApproved && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                  </h2>
                  {selectedUser.chineseName && (
                    <p className="text-sm font-medium text-muted-foreground">{selectedUser.chineseName}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Badge className="bg-slate-800 text-white hover:bg-slate-700 rounded-full px-4 border-none">
                    {selectedUser.role === "ADMIN" ? "관리자 계정" : selectedUser.role === "STAR" ? "스타 (STAR)" : selectedUser.role}
                  </Badge>
                  {selectedUser.isApproved ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full px-4 border-none shadow-none">
                      승인 완료
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-200 text-orange-600 dark:border-orange-800 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 rounded-full px-4">
                      승인 대기중
                    </Badge>
                  )}
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-6">

                {/* Personal Information Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">개인 정보</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">이메일 계정</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{selectedUser.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">연락처</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedUser.phone || "미등록"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5 flex justify-between">
                          주민등록번호
                          {selectedUser.idNumber && (
                            <button
                              onClick={() => setShowSensitive(!showSensitive)}
                              className="text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1 -mt-1 cursor-pointer"
                            >
                              {showSensitive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span className="text-[10px] uppercase font-bold">{showSensitive ? '숨기기' : '보기'}</span>
                            </button>
                          )}
                        </p>
                        <p className={`text-sm font-${selectedUser.idNumber && showSensitive ? 'bold' : 'medium'} text-slate-900 dark:text-slate-100 tracking-wider`}>
                          {!selectedUser.idNumber
                            ? "미등록"
                            : showSensitive
                              ? selectedUser.idNumber
                              : maskIdNumber(selectedUser.idNumber)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Information Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">정산 및 계좌 정보</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Building className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">은행명</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedUser.bankName || "미등록"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">계좌번호</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono tracking-tight">{selectedUser.bankAccount || "미등록"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Section */}
                <div className="pt-4 pb-2">
                  {!selectedUser.isApproved ? (
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-bold h-14 rounded-xl shadow-lg shadow-emerald-600/20"
                      disabled={approveMutation.isPending}
                      onClick={() =>
                        approveMutation.mutate({
                          userId: selectedUser.id,
                          approved: true,
                        })
                      }
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {selectedUser.name}님 계정 승인하기
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">반려 사유 (선택)</label>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 bg-white dark:bg-slate-900"
                          rows={2}
                          placeholder="반려 사유를 입력하세요..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      </div>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 font-bold h-14 rounded-xl dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30 active:scale-[0.98] transition-all"
                        disabled={approveMutation.isPending}
                        onClick={() => {
                          approveMutation.mutate({
                            userId: selectedUser.id,
                            approved: false,
                            rejectionReason: rejectReason.trim() || undefined,
                          });
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="mr-2 h-5 w-5" />
                        가입 승인 취소 (반려)
                      </Button>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
