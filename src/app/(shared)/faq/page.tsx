"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, ChevronDown, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

interface FaqItem {
    id: string;
    question: string;
    answer: string;
    category: string;
}

export default function FaqPage() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const user = useAuthStore((s) => s.user);
    const isAdmin = user?.role === "ADMIN";

    const { data, isLoading } = useQuery<{ data: Record<string, FaqItem[]>; total: number }>({
        queryKey: ["faq"],
        queryFn: async () => {
            const res = await fetch("/api/faq");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const categories = data ? Object.keys(data.data) : [];
    const allItems = data ? Object.values(data.data).flat() : [];

    const filtered = allItems.filter((item) => {
        const matchesSearch = !search || item.question.includes(search) || item.answer.includes(search);
        const matchesCat = !selectedCategory || item.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#050508]">
            <PublicHeader />
            <main className="flex-1 max-w-3xl mx-auto w-full">
                <div className="p-4 md:p-8 pb-28 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="p-2 rounded-xl hover:bg-muted transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">❓ 자주 묻는 질문</h1>
                                <p className="text-xs text-muted-foreground">궁금한 점을 빠르게 찾아보세요</p>
                            </div>
                        </div>
                        {isAdmin && (
                            <Link href="/admin/faq" className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg">관리</Link>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="질문 검색..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Category chips */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all",
                                !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            전체 ({allItems.length})
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all",
                                    selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {cat} ({data?.data[cat]?.length ?? 0})
                            </button>
                        ))}
                    </div>

                    {/* FAQ List */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">검색 결과가 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="rounded-xl border overflow-hidden"
                                >
                                    <button
                                        onClick={() => setOpenId(openId === item.id ? null : item.id)}
                                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/30 transition-colors"
                                    >
                                        <span className="text-sm font-medium pr-4">{item.question}</span>
                                        <ChevronDown className={cn(
                                            "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                                            openId === item.id && "rotate-180"
                                        )} />
                                    </button>
                                    <AnimatePresence>
                                        {openId === item.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-3.5 pb-3.5 text-xs text-muted-foreground leading-relaxed border-t pt-3 whitespace-pre-wrap">
                                                    {item.answer}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <PublicFooter />
        </div>
    );
}
