"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, MessageSquare, PenSquare } from "lucide-react";
import { SidebarWidget } from "./sidebar-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CommunityStats {
  totalMembers: number;
  todayActiveUsers: number;
  todayPosts: number;
  todayComments: number;
  totalPosts: number;
  foundedAt: string;
}

export function CommunityStatsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["board-stats"],
    queryFn: async () => {
      const res = await fetch("/api/board/stats");
      if (!res.ok) throw new Error("Failed to fetch community stats");
      return res.json() as Promise<{ data: CommunityStats }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = data?.data;
  
  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <SidebarWidget
      title="커뮤니티 통계"
      icon={<BarChart3 className="w-4 h-4 text-primary" />}
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 rounded-xl p-3 transition-colors hover:bg-primary/10">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <Users className="w-3.5 h-3.5" /> 총 회원수
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-lg font-bold text-foreground"
                >
                  {stats.totalMembers.toLocaleString()}명
                </motion.div>
              </div>
              
              <div className="bg-green-500/5 rounded-xl p-3 transition-colors hover:bg-green-500/10">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  오늘 방문
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg font-bold text-foreground"
                >
                  {stats.todayActiveUsers.toLocaleString()}명
                </motion.div>
              </div>
              
              <div className="bg-blue-500/5 rounded-xl p-3 transition-colors hover:bg-blue-500/10">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <PenSquare className="w-3.5 h-3.5" /> 오늘 새 글
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-bold text-foreground"
                >
                  {stats.todayPosts.toLocaleString()}개
                </motion.div>
              </div>
              
              <div className="bg-violet-500/5 rounded-xl p-3 transition-colors hover:bg-violet-500/10">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1">
                  <MessageSquare className="w-3.5 h-3.5" /> 오늘 새 댓글
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg font-bold text-foreground"
                >
                  {stats.todayComments.toLocaleString()}개
                </motion.div>
              </div>
            </div>
            
            <div className="pt-2 mt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>총 {stats.totalPosts.toLocaleString()}개의 이야기</span>
              <span>{formatDate(stats.foundedAt)}부터 함께함</span>
            </div>
          </>
        ) : null}
      </div>
    </SidebarWidget>
  );
}
