"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ArrowLeft, Plus, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function StarMessagesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showNew, setShowNew] = useState(false);
    const [newSubject, setNewSubject] = useState("");
    const [newMessage, setNewMessage] = useState("");

    const { data, isLoading } = useQuery<{ data: ConversationItem[] }>({
        queryKey: ["conversations"],
        queryFn: async () => {
            const res = await fetch("/api/conversations");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        refetchInterval: 30_000,
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: newSubject || null, message: newMessage }),
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            setShowNew(false);
            setNewSubject("");
            setNewMessage("");
            router.push(`/stars/messages/${data.id}`);
        },
    });

    return (
        <div className="p-4 pb-28 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/stars/dashboard" className="p-2 rounded-xl hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">💬 메시지</h1>
                        <p className="text-xs text-muted-foreground">관리자에게 문의하세요</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowNew(true)}
                    className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* New Conversation Modal */}
            <AnimatePresence>
                {showNew && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 rounded-xl border bg-card space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">새 대화 시작</h3>
                                <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                            </div>
                            <input
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                placeholder="제목 (선택)"
                                className="w-full px-3 py-2 text-sm rounded-lg border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="궁금한 내용을 입력하세요..."
                                rows={3}
                                className="w-full px-3 py-2 text-sm rounded-lg border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                            <button
                                onClick={() => createMutation.mutate()}
                                disabled={!newMessage.trim() || createMutation.isPending}
                                className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Send className="w-4 h-4" />
                                {createMutation.isPending ? "전송 중..." : "대화 시작"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Conversation List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="h-18 rounded-xl bg-muted/30 animate-pulse" />)}
                </div>
            ) : !data?.data.length ? (
                <div className="text-center py-20">
                    <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground mb-1">아직 대화가 없습니다</p>
                    <p className="text-xs text-muted-foreground/60">궁금한 점이 있으시면 대화를 시작해보세요!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {data.data.map((conv, i) => (
                        <motion.div
                            key={conv.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                        >
                            <Link href={`/stars/messages/${conv.id}`}>
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-muted/30 active:scale-[0.98]",
                                    conv.unreadCount > 0 && "bg-purple-50/50 dark:bg-purple-950/10"
                                )}>
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={conv.admin?.avatarUrl ?? undefined} />
                                        <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                                            {conv.admin?.name?.slice(0, 1) ?? "관"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold truncate">
                                                {conv.subject || conv.admin?.name || "관리자"}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                                                {timeAgo(conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {conv.lastMessage || "새 대화"}
                                        </p>
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
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
