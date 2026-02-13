"use client";

import { useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

export default function AdminDashboardPage() {
  const [videosQuery, pendingQuery, submissionsQuery, settlementsQuery] = useQueries({
    queries: [
      {
        queryKey: ["admin-dash-videos"],
        queryFn: async () => {
          const res = await fetch("/api/videos?page=1&pageSize=1", { cache: "no-store" });
          if (!res.ok) throw new Error("failed");
          return (await res.json()) as { total: number };
        },
      },
      {
        queryKey: ["admin-dash-pending"],
        queryFn: async () => {
          const res = await fetch("/api/submissions?page=1&pageSize=1&status=PENDING", { cache: "no-store" });
          if (!res.ok) throw new Error("failed");
          return (await res.json()) as { total: number };
        },
      },
      {
        queryKey: ["admin-dash-submissions"],
        queryFn: async () => {
          const res = await fetch("/api/submissions?page=1&pageSize=5", { cache: "no-store" });
          if (!res.ok) throw new Error("failed");
          return (await res.json()) as {
            data: { id: string; versionTitle: string | null; version: string; status: string; star: { name: string; chineseName: string | null }; assignment: { request: { title: string } } | null }[];
            total: number;
          };
        },
      },
      {
        queryKey: ["admin-dash-settlements"],
        queryFn: async () => {
          const res = await fetch("/api/settlements?page=1&pageSize=5", { cache: "no-store" });
          if (!res.ok) throw new Error("failed");
          return (await res.json()) as {
            data: { id: string; year: number; month: number; totalAmount: number; status: string; star: { name: string; chineseName: string | null } }[];
            total: number;
          };
        },
      },
    ],
  });

  const videos = videosQuery.data;
  const pendingCount = pendingQuery.data;
  const submissions = submissionsQuery.data;
  const settlements = settlementsQuery.data;
  const loadingVid = videosQuery.isLoading;
  const loadingPending = pendingQuery.isLoading;
  const loadingSub = submissionsQuery.isLoading;
  const loadingSet = settlementsQuery.isLoading;

  const statusLabels: Record<string, string> = {
    PENDING: "대기중",
    IN_REVIEW: "리뷰중",
    APPROVED: "승인됨",
    REJECTED: "반려됨",
    REVISED: "수정됨",
    PROCESSING: "처리중",
    COMPLETED: "완료",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-sm text-muted-foreground">전체 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 요약 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 영상</CardDescription>
            <CardTitle className="text-2xl">
              {loadingVid ? <Skeleton className="h-8 w-16" /> : `${videos?.total ?? 0}개`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 제출물</CardDescription>
            <CardTitle className="text-2xl">
              {loadingSub ? <Skeleton className="h-8 w-16" /> : `${submissions?.total ?? 0}개`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>대기 중 제출물</CardDescription>
            <CardTitle className="text-2xl">
              {loadingPending ? <Skeleton className="h-8 w-16" /> : `${pendingCount?.total ?? 0}개`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 정산</CardDescription>
            <CardTitle className="text-2xl">
              {loadingSet ? <Skeleton className="h-8 w-16" /> : `${settlements?.total ?? 0}건`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 최근 제출물 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">최근 제출물</CardTitle>
            <Link href="/admin/reviews" className="text-sm text-primary hover:underline">전체 보기</Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSub ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={`adsub-${i}`} className="h-10 w-full" />)}
            </div>
          ) : !submissions?.data.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">제출물이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {submissions.data.map((sub) => (
                <Link key={sub.id} href={`/admin/reviews/${sub.id}`}>
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{sub?.assignment?.request?.title ?? '제목 없음'}</p>
                      <p className="text-xs text-muted-foreground">{sub.star.chineseName || sub.star.name} • {sub.versionTitle || `v${sub.version}`}</p>
                    </div>
                    <span className="ml-2 whitespace-nowrap text-xs">{statusLabels[sub.status] ?? sub.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 정산 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">최근 정산</CardTitle>
            <Link href="/admin/settlements" className="text-sm text-primary hover:underline">전체 보기</Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSet ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={`adset-${i}`} className="h-10 w-full" />)}
            </div>
          ) : !settlements?.data.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">정산 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {settlements.data.map((set) => (
                <div key={set.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{set.year}년 {String(set.month).padStart(2, "0")}월</span>
                    <span className="ml-2 text-xs text-muted-foreground">{set.star.chineseName || set.star.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{formatAmount(Number(set.totalAmount))}</span>
                    <span className="text-xs text-muted-foreground">{statusLabels[set.status] ?? set.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
