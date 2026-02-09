"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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

type VideoRow = {
  id: string;
  title: string;
  status: string;
  streamUid: string;
  thumbnailUrl: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  category: { id: string; name: string; slug: string } | null;
};

type VideosResponse = {
  data: VideoRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const res = await fetch("/api/videos?page=1&pageSize=50", { cache: "no-store" });
      if (!res.ok) throw new Error("영상을 불러오지 못했습니다.");
      return (await res.json()) as VideosResponse;
    },
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">영상 관리</h1>
        <p className="text-sm text-muted-foreground">전체 영상 자산을 관리하세요. ({data?.total ?? 0}개)</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={`vid-sk-${i}`} className="h-12 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>소유자</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>등록일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      영상이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[250px] truncate font-medium">{row.title}</TableCell>
                      <TableCell>{row.owner.name}</TableCell>
                      <TableCell>{row.category?.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[row.status]?.variant ?? "secondary"}>
                          {statusMap[row.status]?.label ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
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
