"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale/ko";
import { Calendar as CalendarIcon, Search, X, Share2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssignPlacementModal } from "@/components/admin/assign-placement-modal";

type VideoRow = {
  id: string;
  title: string;
  status: string;
  streamUid: string;
  thumbnailUrl: string | null;
  createdAt: string;
  submissionId: string | null;
  owner: { id: string; name: string; chineseName?: string | null; email: string };
  category: { id: string; name: string; slug: string } | null;
};

type VideosResponse = {
  data: VideoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Category = {
  id: string;
  name: string;
};

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "secondary" },
  PROCESSING: { label: "처리중", variant: "default" },
  APPROVED: { label: "승인됨", variant: "outline" },
  FINAL: { label: "최종", variant: "outline" },
  REJECTED: { label: "반려됨", variant: "destructive" },
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(dateStr));
}

export default function AdminVideosPage() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const [categoryId, setCategoryId] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);

  const pageSize = 50;

  // 카테고리 목록 가져오기
  const { data: catData } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { data: [] };
      return (await res.json()) as { data: Category[] };
    },
  });
  const categories = catData?.data ?? [];

  // 영상 목록 가져오기 (필터 적용)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-videos", page, sort, categoryId, ownerName, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort,
      });
      if (categoryId !== "all") params.set("categoryId", categoryId);
      if (ownerName) params.set("ownerName", ownerName);
      if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString());
      if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString());

      const res = await fetch(`/api/videos?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 불러오지 못했습니다.");
      return (await res.json()) as VideosResponse;
    },
  });

  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerName(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">영상 관리</h1>
        <p className="text-sm text-muted-foreground">전체 영상 자산을 관리하세요. ({data?.total ?? 0}개)</p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <form onSubmit={handleSearch} className="flex flex-1 max-w-sm gap-2">
              <Input
                placeholder="작성자 이름 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
              />
              <Button type="submit" variant="secondary" size="icon">
                <Search className="w-4 h-4" />
                <span className="sr-only">검색</span>
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {/* DateRange Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-[260px] justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "yyyy. MM. dd", { locale: ko })} -{" "}
                          {format(dateRange.to, "yyyy. MM. dd", { locale: ko })}
                        </>
                      ) : (
                        format(dateRange.from, "yyyy. MM. dd", { locale: ko })
                      )
                    ) : (
                      <span>기간 설정</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range: DateRange | undefined) => {
                      setDateRange(range);
                      setPage(1);
                    }}
                    numberOfMonths={2}
                    locale={ko}
                  />
                  {dateRange && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          setDateRange(undefined);
                          setPage(1);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" /> 초기화
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 분류</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(val) => { setSort(val); setPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="oldest">오래된순</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={`vid-sk-${i}`} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">제목</TableHead>
                    <TableHead>소유자 (한글 이름)</TableHead>
                    <TableHead>소유자 (닉네임)</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead className="text-right pr-6">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        조건에 맞는 영상이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} className={isFetching ? "opacity-50 transition-opacity" : "transition-opacity"}>
                        <TableCell className="pl-6 max-w-[250px] truncate font-medium">{row.title}</TableCell>
                        <TableCell>{row.owner.chineseName || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{row.owner.name}</TableCell>
                        <TableCell>{row.category?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant={statusMap[row.status]?.variant ?? "secondary"}>
                            {statusMap[row.status]?.label ?? row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                        <TableCell className="text-right pr-6 space-x-2 whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedVideo({ id: row.id, title: row.title });
                              setModalOpen(true);
                            }}
                            className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-transparent"
                          >
                            <Share2 className="w-3.5 h-3.5 mr-1" /> 매체 등록
                          </Button>
                          {row.submissionId ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/admin/reviews/${row.submissionId}`}>
                                상세보기
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled title="제출된 피드백 기록이 없습니다.">
                              상세보기
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination UI */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t">
                  <span className="text-sm font-medium text-muted-foreground">
                    총 <span className="text-foreground">{data?.total ?? 0}</span>건 ({page} / {totalPages})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isFetching}
                      className="px-3"
                    >
                      이전
                    </Button>

                    {(() => {
                      const maxVisible = 8;
                      let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                      let endPage = startPage + maxVisible - 1;
                      if (endPage > totalPages) {
                        endPage = totalPages;
                        startPage = Math.max(1, endPage - maxVisible + 1);
                      }
                      return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                        const pageNum = startPage + i;
                        const isActive = page === pageNum;
                        return (
                          <Button
                            key={pageNum}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={`w-9 h-9 p-0 ${isActive ? "pointer-events-none" : ""}`}
                            disabled={isFetching}
                          >
                            {pageNum}
                          </Button>
                        );
                      });
                    })()}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages || isFetching}
                      className="px-3"
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVideo && (
        <AssignPlacementModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          videoId={selectedVideo.id}
          videoTitle={selectedVideo.title}
        />
      )}
    </div>
  );
}
