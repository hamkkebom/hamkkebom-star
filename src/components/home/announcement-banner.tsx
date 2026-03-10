"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, ChevronRight, AlertTriangle, Info, Bell } from "lucide-react";
import Link from "next/link";

const priorityStyles: Record<string, { bg: string; icon: typeof AlertTriangle; text: string }> = {
    URGENT: { bg: "from-rose-600 to-rose-500", icon: AlertTriangle, text: "긴급" },
    HIGH: { bg: "from-amber-600 to-amber-500", icon: Bell, text: "중요" },
    NORMAL: { bg: "from-violet-600 to-indigo-600", icon: Megaphone, text: "공지" },
    LOW: { bg: "from-slate-600 to-slate-500", icon: Info, text: "안내" },
};

type AnnouncementItem = {
    id: string;
    title: string;
    priority: string;
    createdAt: string;
};

export function AnnouncementBanner() {
    const [dismissed, setDismissed] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const { data } = useQuery({
        queryKey: ["public-announcements"],
        queryFn: async () => {
            const res = await fetch("/api/announcements/public");
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []) as AnnouncementItem[];
        },
        staleTime: 2 * 60 * 1000,
    });

    const items = data || [];

    // 자동 슬라이드
    useEffect(() => {
        if (items.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [items.length]);

    // 24시간 숨김 체크
    useEffect(() => {
        const hiddenUntil = localStorage.getItem("announcement-hidden");
        if (hiddenUntil && Date.now() < Number(hiddenUntil)) {
            setDismissed(true);
        }
    }, []);

    if (dismissed || items.length === 0) return null;

    const current = items[currentIndex];
    const style = priorityStyles[current.priority] || priorityStyles.NORMAL;
    const IconComp = style.icon;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={current.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className={`relative bg-gradient-to-r ${style.bg} text-white`}
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
                    <Link
                        href={`/announcements/${current.id}`}
                        className="flex flex-1 items-center gap-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {style.text}
                        </span>
                        <span className="truncate">{current.title}</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    </Link>

                    {items.length > 1 && (
                        <div className="mx-3 flex items-center gap-1">
                            {items.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                                />
                            ))}
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setDismissed(true);
                            localStorage.setItem("announcement-hidden", String(Date.now() + 24 * 60 * 60 * 1000));
                        }}
                        className="rounded-full p-1 hover:bg-white/20 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
