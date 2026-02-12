"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}

export default function StarDashboardPage() {
  const { data: submissions, isLoading: loadingSub } = useQuery({
    queryKey: ["dashboard-submissions"],
    queryFn: async () => {
      const res = await fetch("/api/submissions/my?page=1&pageSize=5", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { data: { id: string; versionTitle: string | null; version: string; status: string; createdAt: string; assignment: { request: { title: string } }; _count?: { feedbacks: number } }[]; total: number };
    },
  });

  const { data: settlements, isLoading: loadingSet } = useQuery({
    queryKey: ["dashboard-settlements"],
    queryFn: async () => {
      const res = await fetch("/api/settlements?page=1&pageSize=5", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      return (await res.json()) as { data: { id: string; year: number; month: number; totalAmount: number; status: string }[]; total: number };
    },
  });

  const statusLabels: Record<string, string> = {
    PENDING: "대기중",
    IN_REVIEW: "리뷰중",
    APPROVED: "승인됨",
    REJECTED: "반려됨",
    REVISED: "수정됨",
    PROCESSING: "처리중",
    COMPLETED: "완료",
    CANCELLED: "취소됨",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground">진행 중인 작업과 최근 활동을 확인하세요.</p>
      </div>

      {/* 요약 */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardDescription>총 정산</CardDescription>
            <CardTitle className="text-2xl">
              {loadingSet ? <Skeleton className="h-8 w-16" /> : `${settlements?.total ?? 0}건`}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 수입</CardDescription>
            <CardTitle className="text-2xl">
              {loadingSet ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatAmount(
                  settlements?.data
                    ?.filter((s) => s.status === "COMPLETED")
                    .reduce((sum, s) => sum + Number(s.totalAmount), 0) ?? 0
                )
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 할 일 */}
      {!loadingSub && submissions?.data && (() => {
        const withFeedback = submissions.data.filter((s) => (s._count?.feedbacks ?? 0) > 0 && s.status !== "APPROVED");
        const pendingReview = submissions.data.filter((s) => s.status === "IN_REVIEW" || s.status === "REVISED");
        if (withFeedback.length === 0 && pendingReview.length === 0) return null;
        return (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">📝 지금 확인할 사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {withFeedback.length > 0 && (
                <Link href="/stars/feedback" className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm hover:bg-primary/10 transition-colors">
                  <span>피드백 확인이 필요한 영상</span>
                  <span className="font-bold text-primary">{withFeedback.length}건</span>
                </Link>
              )}
              {pendingReview.length > 0 && (
                <Link href="/stars/my-videos" className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm hover:bg-amber-500/10 transition-colors">
                  <span>리뷰 중인 영상</span>
                  <span className="font-bold text-amber-500">{pendingReview.length}건</span>
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* 최근 제출물 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">최근 제출물</CardTitle>
            <Link href="/stars/my-videos" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSub ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={`dsub-${i}`} className="h-10 w-full" />)}
            </div>
          ) : !submissions?.data.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">아직 제출물이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {submissions.data.map((sub) => (
                <Link key={sub.id} href={`/stars/my-videos/${sub.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:border-primary/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{sub.versionTitle || `v${sub.version}`}</p>
                    <p className="truncate text-xs text-muted-foreground">{sub?.assignment?.request?.title ?? '제목 없음'}</p>
                  </div>
                  <span className="ml-2 whitespace-nowrap text-xs">{statusLabels[sub.status] ?? sub.status}</span>
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
            <Link href="/stars/earnings" className="text-sm text-primary hover:underline">
              전체 보기
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSet ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={`dset-${i}`} className="h-10 w-full" />)}
            </div>
          ) : !settlements?.data.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">아직 정산 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {settlements.data.map((set) => (
                <div key={set.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{set.year}년 {String(set.month).padStart(2, "0")}월</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">{formatAmount(Number(set.totalAmount))}</span>
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
