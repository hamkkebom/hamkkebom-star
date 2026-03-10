"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BookmarkButtonProps {
    videoId: string;
    initialBookmarked: boolean;
}

export function BookmarkButton({ videoId, initialBookmarked }: BookmarkButtonProps) {
    const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
    const { user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async () => {
            if (!user) {
                toast.error("로그인이 필요합니다");
                router.push("/auth/login");
                throw new Error("unauthorized");
            }
            const res = await fetch(`/api/videos/${videoId}/bookmark`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("북마크 처리 실패");
            return res.json();
        },
        onMutate: () => {
            if (!user) return;
            setIsBookmarked(!isBookmarked);
            // Haptic feedback (K-Casual)
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(50);
            }
        },
        onError: () => {
            // Revert optimistic update
            if (user) {
                setIsBookmarked(isBookmarked);
                toast.error("오류가 발생했습니다");
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["video-detail", videoId] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-bookmarks"] });
        },
    });

    return (
        <Button
            variant="ghost"
            size="icon"
            className={`rounded-full border border-white/10 relative overflow-hidden transition-all ${isBookmarked
                ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                : "text-white/50 hover:border-white/20 hover:bg-white/5 hover:text-white"
                }`}
            onClick={() => mutation.mutate()}
            title="북마크"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={isBookmarked ? "bookmarked" : "unbookmarked"}
                    initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                </motion.div>
            </AnimatePresence>
        </Button>
    );
}
