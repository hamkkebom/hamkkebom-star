"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft, Inbox, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ConversationItem {
    id: string;
    subject: string | null;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    star: { id: string; name: string; avatarUrl: string | null };
    admin: { id: string; name: string; avatarUrl: string | null } | null;
}

type Filter = "all" | "unresponded" | "mine";

function timeAgo(d: string | null): string {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간`;
    return `${Math.floor(h / 24)}일`;
}

export default function AdminMessagesPage() {
    const [filter, setFilter] = useState<Filter>("all");

    const { data, isLoading } = useQuery<{ data: ConversationItem[] }>({
        queryKey: ["admin-conversations"],
        queryFn: async () => {
            const res = await fetch("/api/conversations");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 15_000,
    });

    const allConvs = data?.data || [];
    const unrespondedCount = allConvs.filter((c) => !c.admin).length;
    const totalUnread = allConvs.reduce((s, c) => s + c.unreadCount, 0);

    const filtered = filter === "unresponded"
        ? allConvs.filter((c) => !c.admin)
        : filter === "mine"
            ? allConvs.filter((c) => c.admin !== null)
            : allConvs;

    const filters: { key: Filter; label: string; count?: number }[] = [
        { key: "all", label: "전체", count: allConvs.length },
        { key: "unresponded", label: "미답변", count: unrespondedCount },
        { key: "mine", label: "내 담당" },
    ];

    return (
        <div className="p-4 pb-28 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin" className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">💬 메시지 관리</h1>
                        {totalUnread > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        STAR 문의 관리 · 미답변 {unrespondedCount}건
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                            filter === f.key ? "bg-white dark:bg-zinc-800 shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {f.label}
                        {f.count !== undefined && ` (${f.count})`}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-18 rounded-xl bg-muted/30 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <Inbox className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">대화가 없습니다</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((conv, i) => (
                        <motion.div
                            key={conv.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <Link href={`/admin/messages/${conv.id}`}>
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-muted/30 active:scale-[0.98]",
                                    conv.unreadCount > 0 && "bg-purple-50/50 dark:bg-purple-950/10"
                                )}>
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={conv.star.avatarUrl ?? undefined} />
                                        <AvatarFallback className="text-xs">{conv.star.name.slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-semibold truncate">{conv.star.name}</span>
                                                {!conv.admin && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                        미배정
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(conv.lastMessageAt)}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {conv.subject ? `[${conv.subject}] ` : ""}{conv.lastMessage || "새 대화"}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
