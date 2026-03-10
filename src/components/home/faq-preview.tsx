"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";

type FaqItem = {
    id: string;
    question: string;
    answer: string;
    category: string;
};

export function FaqPreview() {
    const [openId, setOpenId] = useState<string | null>(null);

    const { data: items = [] } = useQuery<FaqItem[]>({
        queryKey: ["public-faq"],
        queryFn: async () => {
            const res = await fetch("/api/faq/public");
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data || []).slice(0, 5);
        },
        staleTime: 5 * 60 * 1000,
    });

    if (items.length === 0) return null;

    return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-black text-foreground">자주 묻는 질문</h2>
                </div>
                <Link
                    href="/faq"
                    className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                    전체 보기
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                    <div key={item.id}>
                        <button
                            onClick={() => setOpenId(openId === item.id ? null : item.id)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-sm font-bold text-foreground pr-4">
                                {item.question}
                            </span>
                            <motion.div
                                animate={{ rotate: openId === item.id ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            </motion.div>
                        </button>
                        <AnimatePresence>
                            {openId === item.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed bg-slate-50/50 dark:bg-slate-800/30">
                                        {item.answer}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            <div className="mt-4 text-center">
                <Link
                    href="/guide"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                    <BookOpen className="w-4 h-4" />
                    이용 가이드 보기
                </Link>
            </div>
        </section>
    );
}
