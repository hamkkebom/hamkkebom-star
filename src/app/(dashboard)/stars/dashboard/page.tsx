"use client";

import { useQueries } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function StarDashboardPage() {
  const [submissionsQuery] = useQueries({
    queries: [
      {
        queryKey: ["dashboard-submissions"],
        queryFn: async () => {
          const res = await fetch("/api/submissions/my?page=1&pageSize=5", { cache: "no-store" });
          if (!res.ok) throw new Error("failed");
          return (await res.json()) as { data: { id: string; versionTitle: string | null; version: string; status: string; createdAt: string; assignment: { request: { title: string } }; _count?: { feedbacks: number } }[]; total: number };
        },
      },
    ],
  });

  const submissions = submissionsQuery.data;
  const loadingSub = submissionsQuery.isLoading;

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
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 제출물</CardDescription>
            <CardTitle className="text-2xl">
              {loadingSub ? <Skeleton className="h-8 w-16" /> : `${submissions?.total ?? 0}개`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

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
                    <p className="truncate font-medium">{sub.versionTitle || (sub.version.startsWith("v") ? sub.version : `v${sub.version}`)}</p>
                    <p className="truncate text-xs text-muted-foreground">{sub?.assignment?.request?.title ?? '제목 없음'}</p>
                  </div>
                  <span className="ml-2 whitespace-nowrap text-xs">{statusLabels[sub.status] ?? sub.status}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
