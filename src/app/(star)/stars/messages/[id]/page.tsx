"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";

interface MessageItem {
    id: string;
    content: string;
    messageType: string;
    isRead: boolean;
    createdAt: string;
    sender: { id: string; name: string; avatarUrl: string | null };
}

interface ConversationDetail {
    id: string;
    subject: string | null;
    star: { id: string; name: string; avatarUrl: string | null };
    admin: { id: string; name: string; avatarUrl: string | null } | null;
    messages: MessageItem[];
}

function formatTime(d: string) {
    const date = new Date(d);
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: string, b: string): boolean {
    return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ChatPage() {
    const { id } = useParams<{ id: string }>();
    const user = useAuthStore((s) => s.user);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const isAdmin = user?.role === "ADMIN";
    const basePath = isAdmin ? "/admin/messages" : "/stars/messages";

    const { data } = useQuery<{ data: ConversationDetail }>({
        queryKey: ["conversation", id],
        queryFn: async () => {
            const res = await fetch(`/api/conversations/${id}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!id,
        refetchInterval: 5_000,
    });

    const sendMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/conversations/${id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversation", id] });
            setInput("");
        },
    });

    const conversation = data?.data;
    const otherUser = isAdmin ? conversation?.star : conversation?.admin;
    const messages = conversation?.messages || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const handleSend = () => {
        if (!input.trim() || sendMutation.isPending) return;
        sendMutation.mutate(input.trim());
    };

    return (
        <div className="flex flex-col h-[100dvh]">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b bg-card/80 backdrop-blur-md">
                <Link href={basePath} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <Avatar className="w-8 h-8">
                    <AvatarImage src={otherUser?.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">{otherUser?.name?.slice(0, 1) ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{otherUser?.name ?? "관리자"}</p>
                    {conversation?.subject && (
                        <p className="text-[10px] text-muted-foreground truncate">{conversation.subject}</p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
                {messages.map((msg, i) => {
                    const isMine = msg.sender.id === user?.id;
                    const showDate = i === 0 || !isSameDay(msg.createdAt, messages[i - 1].createdAt);

                    return (
                        <div key={msg.id}>
                            {showDate && (
                                <div className="text-center my-3">
                                    <span className="px-3 py-1 rounded-full bg-muted/60 text-[10px] text-muted-foreground">
                                        {new Date(msg.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                                    </span>
                                </div>
                            )}
                            <motion.div
                                initial={{ opacity: 0, y: 6, x: isMine ? 10 : -10 }}
                                animate={{ opacity: 1, y: 0, x: 0 }}
                                className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}
                            >
                                {!isMine && (
                                    <Avatar className="w-7 h-7 mt-1 flex-shrink-0">
                                        <AvatarImage src={msg.sender.avatarUrl ?? undefined} />
                                        <AvatarFallback className="text-[8px]">{msg.sender.name.slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-[75%]", isMine && "flex flex-col items-end")}>
                                    <div className={cn(
                                        "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                        isMine
                                            ? "bg-primary text-primary-foreground rounded-tr-md"
                                            : "bg-card border rounded-tl-md"
                                    )}>
                                        {msg.content}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5 px-1">
                                        <span className="text-[9px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                                        {isMine && (
                                            msg.isRead
                                                ? <CheckCheck className="w-3 h-3 text-primary" />
                                                : <Check className="w-3 h-3 text-muted-foreground/40" />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-card/80 backdrop-blur-md pb-[env(safe-area-inset-bottom,12px)]">
                <div className="flex items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="메시지를 입력하세요..."
                        rows={1}
                        className="flex-1 px-3 py-2.5 text-sm rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none max-h-24"
                    />
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleSend}
                        disabled={!input.trim() || sendMutation.isPending}
                        className={cn(
                            "p-2.5 rounded-xl transition-colors flex-shrink-0",
                            input.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
