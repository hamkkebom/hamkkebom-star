"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const priorityConfig = {
    URGENT: { color: "bg-red-500", text: "긴급" },
    HIGH: { color: "bg-orange-500", text: "중요" },
    NORMAL: { color: "bg-blue-500", text: "일반" },
    LOW: { color: "bg-zinc-400", text: "참고" },
};

interface AnnouncementDetail {
    id: string;
    title: string;
    content: string;
    priority: keyof typeof priorityConfig;
    author: { name: string; avatarUrl: string | null };
    createdAt: string;
    updatedAt: string;
}

export default function AnnouncementDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data, isLoading, error } = useQuery<{ data: AnnouncementDetail }>({
        queryKey: ["announcement", id],
        queryFn: async () => {
            const res = await fetch(`/api/announcements/${id}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!id,
    });

    const announcement = data?.data;
    const config = announcement ? priorityConfig[announcement.priority] : null;

    if (isLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="h-8 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="space-y-2 mt-6">
                    {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-muted rounded animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (error || !announcement) {
        return (
            <div className="p-4 text-center py-20">
                <p className="text-muted-foreground">공지사항을 찾을 수 없습니다.</p>
                <Link href="/announcements" className="text-sm text-primary mt-2 inline-block">← 목록으로</Link>
            </div>
        );
    }

    return (
        <div className="p-4 pb-28 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/announcements" className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                {config && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${config.color}`}>
                        {config.text}
                    </span>
                )}
            </div>

            {/* Title */}
            <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xl font-bold leading-tight"
            >
                {announcement.title}
            </motion.h1>

            {/* Meta */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 text-xs text-muted-foreground"
            >
                <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5">
                        <AvatarImage src={announcement.author.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[8px]">{announcement.author.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span>{announcement.author.name}</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(announcement.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
            </motion.div>

            {/* Divider */}
            <div className="border-b" />

            {/* Content */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap"
            >
                {announcement.content}
            </motion.div>
        </div>
    );
}
