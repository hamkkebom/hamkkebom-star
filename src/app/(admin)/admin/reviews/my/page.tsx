"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Hand } from "lucide-react";
import { toast } from "sonner";
import { FeedbackDashboard } from "@/components/admin/feedback-dashboard";
import { FeedbackDashboardSkeleton } from "@/components/admin/feedback-dashboard-skeleton";
import { FeedbackSwipeSheet, type FeedbackSwipeItem } from "@/components/admin/feedback-swipe-sheet";
import type { Submission } from "@/types/feedback-workspace";

function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(dateStr));
}

export default function MyReviewsPage() {
    const queryClient = useQueryClient();
    const [isSwipeSheetOpen, setIsSwipeSheetOpen] = useState(false);

    const { data: submissions, isLoading, error } = useQuery({
        queryKey: ["my-reviews"],
        queryFn: async () => {
            const res = await fetch("/api/admin/reviews/my", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const json = await res.json();
            return json.data as Submission[];
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/submissions/${id}/approve`, { method: "PATCH" });
            if (!res.ok) {
                const err = (await res.json()) as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "승인에 실패했습니다.");
            }
        },
        onSuccess: async () => {
            toast.success("제출물이 승인되었습니다.");
            await queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "승인에 실패했습니다.");
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
            const res = await fetch(`/api/submissions/${id}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: reason || "관리자 반려" }),
            });
            if (!res.ok) {
                const err = (await res.json()) as { error?: { message?: string } };
                throw new Error(err.error?.message ?? "반려에 실패했습니다.");
            }
        },
        onSuccess: async () => {
            toast.success("제출물이 반려되었습니다.");
            await queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : "반려에 실패했습니다.");
        },
    });

    // 스와이프 심사 대상: PENDING, IN_REVIEW, REVISED 상태 + streamUid 있는 항목
    const swipeItems: FeedbackSwipeItem[] = useMemo(() => {
        if (!submissions) return [];
        return submissions
            .filter((sub) => ["PENDING", "IN_REVIEW", "REVISED"].includes(sub.status))
            .map((sub) => ({
                id: sub.id,
                projectTitle: sub.versionTitle || sub.assignment?.request?.title || sub.video?.title || `v${sub.version.replace(/^v/i, "")}`,
                subTitle: sub.assignment?.request?.title && sub.versionTitle ? sub.assignment.request.title : undefined,
                starName: sub.star.chineseName || sub.star.name,
                starEmail: sub.star.email,
                version: sub.version,
                streamUid: sub.streamUid || sub.video?.streamUid || undefined,
                createdAt: formatDate(sub.createdAt),
                status: sub.status,
                feedbackCount: sub._count?.feedbacks ?? 0,
            }))
            .filter((item) => !!item.streamUid);
    }, [submissions]);

    if (isLoading) {
        return <FeedbackDashboardSkeleton />;
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

    return (
        <>
            {/* 모바일 스와이프 심사 FAB 버튼 — Enhanced with shimmer */}
            {swipeItems.length > 0 && (
                <div className="block md:hidden mb-4 px-4">
                    <button
                        onClick={() => setIsSwipeSheetOpen(true)}
                        className="relative w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-foreground font-bold text-base shadow-lg shadow-violet-500/30 hover:shadow-xl active:scale-[0.98] transition-all overflow-hidden"
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        <Hand className="w-6 h-6 relative z-10" />
                        <span className="relative z-10">스와이프 피드백 심사</span>
                        <span className="ml-auto bg-accent text-foreground text-xs font-black px-2.5 py-1 rounded-full relative z-10">
                            {swipeItems.length}건
                        </span>
                    </button>
                </div>
            )}

            {/* 스와이프 심사 바텀시트 */}
            <FeedbackSwipeSheet
                open={isSwipeSheetOpen}
                onOpenChange={setIsSwipeSheetOpen}
                items={swipeItems}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
                onViewDetail={(id) => {
                    setIsSwipeSheetOpen(false);
                    window.location.href = `/admin/reviews/my/${id}`;
                }}
            />

            <FeedbackDashboard submissions={submissions || []} />

            {/* Shimmer animation keyframe */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </>
    );
}
