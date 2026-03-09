"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Megaphone, ArrowLeft, Bell, AlertTriangle, Info, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const priorityConfig = {
    URGENT: { color: "bg-red-500", text: "긴급", textColor: "text-red-600", barColor: "bg-red-500", pulse: true },
    HIGH: { color: "bg-orange-500", text: "중요", textColor: "text-orange-600", barColor: "bg-orange-500", pulse: false },
    NORMAL: { color: "bg-blue-500", text: "일반", textColor: "text-blue-600", barColor: "bg-blue-500", pulse: false },
    LOW: { color: "bg-zinc-400", text: "참고", textColor: "text-zinc-500", barColor: "bg-zinc-400", pulse: false },
};

type FilterType = "all" | "important" | "unread";

interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    priority: keyof typeof priorityConfig;
    isRead: boolean;
    author: { name: string; avatarUrl: string | null };
    createdAt: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
}

export default function AnnouncementsPage() {
    const [filter, setFilter] = useState<FilterType>("all");
    const user = useAuthStore((s) => s.user);
    const isAdmin = user?.role === "ADMIN";

    const { data, isLoading } = useQuery<{ data: AnnouncementItem[]; unreadCount: number }>({
        queryKey: ["announcements", filter],
        queryFn: async () => {
            const res = await fetch(`/api/announcements?filter=${filter}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: "전체" },
        { key: "important", label: "중요" },
        { key: "unread", label: "안읽음" },
    ];

    return (
        <div className="p-4 pb-28 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href={isAdmin ? "/admin" : "/stars/dashboard"} className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold">📢 공지사항</h1>
                            {(data?.unreadCount ?? 0) > 0 && (
                                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {data!.unreadCount}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">시스템 공지 · 업데이트 알림</p>
                    </div>
                </div>
                {isAdmin && (
                    <Link
                        href="/admin/announcements"
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        관리
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                            filter === f.key
                                ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
                    ))}
                </div>
            ) : !data?.data.length ? (
                <div className="text-center py-16">
                    <Bell className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {filter === "unread" ? "읽지 않은 공지가 없습니다" : "공지사항이 없습니다"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {data.data.map((item, i) => {
                        const config = priorityConfig[item.priority];
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Link href={`/announcements/${item.id}`}>
                                    <div className={cn(
                                        "relative flex gap-3 p-3.5 rounded-xl border transition-all hover:bg-muted/30 active:scale-[0.98]",
                                        !item.isRead && "bg-purple-50/50 dark:bg-purple-950/10 border-purple-200/50 dark:border-purple-800/30"
                                    )}>
                                        {/* 미읽음 바 */}
                                        {!item.isRead && (
                                            <div className={cn(
                                                "absolute left-0 top-2 bottom-2 w-1 rounded-full",
                                                config.barColor,
                                                config.pulse && "animate-pulse"
                                            )} />
                                        )}

                                        <div className="flex-1 min-w-0 ml-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[9px] font-bold text-white",
                                                    config.color
                                                )}>
                                                    {config.text}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                                            </div>
                                            <h3 className={cn(
                                                "text-sm font-medium line-clamp-2 mb-1",
                                                !item.isRead && "font-semibold"
                                            )}>
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {item.content}
                                            </p>
                                        </div>

                                        <ChevronRight className="w-4 h-4 mt-1 text-muted-foreground/40 flex-shrink-0" />
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
