"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard";
import { MobileGroupedReviewList } from "@/components/admin/mobile-grouped-review-list";
import { MobileGroupedReviewSkeleton } from "@/components/admin/mobile-review-skeleton";
import type { Submission } from "@/types/feedback-workspace";

export default function MyReviewsPage() {
    const { data: submissions, isLoading, error } = useQuery({
        queryKey: ["my-reviews"],
        queryFn: async () => {
            const res = await fetch("/api/admin/reviews/my", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const json = await res.json();
            return json.data as Submission[];
        }
    });

    if (isLoading) {
        return (
            <>
                {/* Mobile skeleton */}
                <MobileGroupedReviewSkeleton />
                {/* Desktop skeleton — FeedbackDashboard handles its own skeleton via parent */}
                <div className="hidden md:block">
                    <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
                        ))}
                    </div>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 p-6 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-400 max-w-md text-center">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <h3 className="text-lg font-bold">오류 발생</h3>
                    <p className="text-sm">
                        데이터를 불러오는 중 문제가 발생했습니다.<br />잠시 후 다시 시도해주세요.
                    </p>
                </div>
            </div>
        );
    }

    const subs = submissions ?? [];

    return (
        <>
            {/* Mobile: grouped review list (md 미만) */}
            <MobileGroupedReviewList
                submissions={subs}
                queryKey={["my-reviews"]}
                detailBase="/admin/reviews/my"
            />

            {/* Desktop: full feedback dashboard (md 이상) */}
            <div className="hidden md:block">
                <FeedbackDashboard submissions={subs} />
            </div>
        </>
    );
}
