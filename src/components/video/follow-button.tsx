"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
}

export function FollowButton({
  targetUserId,
  initialFollowing,
  initialFollowerCount,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isHovered, setIsHovered] = useState(false);
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
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("팔로우 처리 실패");
      return res.json() as Promise<{ following: boolean }>;
    },
    onMutate: async () => {
      if (!user) return;

      await queryClient.cancelQueries({
        queryKey: ["follow-status", targetUserId],
      });

      const previousFollowing = isFollowing;
      const previousCount = followerCount;

      // Optimistic update
      setIsFollowing((prev) => !prev);
      setFollowerCount((prev) => (isFollowing ? prev - 1 : prev + 1));

      return { previousFollowing, previousCount };
    },
    onError: (_err, _variables, context) => {
      if (context) {
        setIsFollowing(context.previousFollowing);
        setFollowerCount(context.previousCount);
      }
      if (user) {
        toast.error("오류가 발생했습니다");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["follow-status", targetUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["video-detail"] });
    },
  });

  // Self-follow prevention
  if (targetUserId === user?.id) {
    return null;
  }

  // Determine button visual state
  const showUnfollow = isFollowing && isHovered;

  return (
    <div className="flex items-center gap-3">
      <Button
        className={`gap-2 rounded-full font-bold transition-all active:scale-95 ${
          isFollowing
            ? showUnfollow
              ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
            : "bg-violet-600 text-foreground hover:bg-violet-700 shadow-[0_0_20px_rgba(124,58,237,0.3)]"
        }`}
        variant={isFollowing ? "outline" : "default"}
        onClick={() => mutation.mutate()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={mutation.isPending}
      >
        <AnimatePresence mode="wait" initial={false}>
          {showUnfollow ? (
            <motion.span
              key="unfollow"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <UserMinus className="h-4 w-4" />
              언팔로우
            </motion.span>
          ) : isFollowing ? (
            <motion.span
              key="following"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <UserCheck className="h-4 w-4" />
              팔로잉
            </motion.span>
          ) : (
            <motion.span
              key="follow"
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <UserPlus className="h-4 w-4" />
              팔로우
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {followerCount}명
      </span>
    </div>
  );
}
