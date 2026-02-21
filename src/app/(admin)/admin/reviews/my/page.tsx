"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard";
import { FeedbackDashboardSkeleton } from "@/components/admin/feedback-dashboard-skeleton";
export default function MyReviewsPage() {
    const { data: submissions, isLoading, error } = useQuery({
        queryKey: ["my-reviews"],
        queryFn: async () => {
            const res = await fetch("/api/admin/reviews/my", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const json = await res.json();
            return json.data;
        }
    });

    if (isLoading) {
        return <FeedbackDashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="p-8 bg-slate-950 h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 p-6 rounded-xl border border-red-500/50 bg-red-500/10 text-red-400 max-w-md text-center">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <h3 className="text-lg font-bold">오류 발생</h3>
                    <p className="text-sm">
                        데이터를 불러오는 중 문제가 발생했습니다.<br />잠시 후 다시 시도해주세요.
                    </p>
                </div>
            </div>
        );
    }


    return <FeedbackDashboard submissions={submissions || []} />;
}
