"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { FeedbackWorkspace } from "@/components/admin/feedback-workspace";
import { useParams } from "next/navigation";

export default function ReviewDetailPage() {
    const params = useParams();
    const id = params?.id as string;

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
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#050508]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">상세 워크스페이스 로딩 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-[#050508] h-full flex items-center justify-center">
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

    return <FeedbackWorkspace submissions={submissions || []} initialSelectedId={id} isStandalone={true} />;
}
