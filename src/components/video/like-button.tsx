"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LikeButtonProps {
    videoId: string;
    initialLiked: boolean;
    initialCount: number;
}

export function LikeButton({ videoId, initialLiked, initialCount }: LikeButtonProps) {
    // SSR 환경에서의 하이드레이션 문제 방지용 내부 state (Optimistic)
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const queryClient = useQueryClient();

    const { mutate } = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/videos/${videoId}/like`, {
                method: "POST",
            });
            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("UNAUTHORIZED");
                }
                throw new Error("오류가 발생했습니다.");
            }
            return res.json();
        },
        onMutate: async () => {
            // 진행 중인 refetches 취소하여 덮어쓰기 방지
            await queryClient.cancelQueries({ queryKey: ["video", videoId] });

            // 이전 상태 저장
            const previousLiked = liked;
            const previousCount = count;

            // Optimistic Update
            setLiked((prev) => !prev);
            setCount((prev) => (liked ? prev - 1 : prev + 1));

            return { previousLiked, previousCount };
        },
        onError: (err, variables, context) => {
            // 에러 시 롤백
            if (context) {
                setLiked(context.previousLiked);
                setCount(context.previousCount);
            }
            if (err.message === "UNAUTHORIZED") {
                alert("로그인이 필요합니다."); // TODO: 전역 Toast 적용 가능
            }
        },
        onSettled: () => {
            // 성공/실패 무관하게 해당 비디오 쿼리 캐시 만료
            queryClient.invalidateQueries({ queryKey: ["video", videoId] });
            queryClient.invalidateQueries({ queryKey: ["videos"] });
        },
    });

    const handleLikeClick = (e: React.MouseEvent) => {
        e.preventDefault();
        mutate();
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative flex items-center justify-center p-0 hover:bg-transparent overflow-hidden"
            onClick={handleLikeClick}
            title={liked ? "좋아요 취소" : "좋아요"}
        >
            {/* 바운스 링 이펙트 (클릭 시 순간적으로 퍼지는 파티클 대체) */}
            <AnimatePresence>
                {liked && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-pink-500 z-0"
                        initial={{ scale: 0.8, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                )}
            </AnimatePresence>

            <motion.div
                className="relative z-10 flex cursor-pointer items-center justify-center rounded-full bg-slate-800/50 p-3 hover:bg-slate-700/50 transition-colors"
                whileTap={{ scale: 0.8 }}
                animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                <Heart
                    className={`h-5 w-5 transition-colors duration-200 ${liked ? "fill-pink-500 text-pink-500" : "text-white/70"
                        }`}
                />
            </motion.div>

            {/* 카운트 (선택 사항) */}
            {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold text-white z-20">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </Button>
    );
}
