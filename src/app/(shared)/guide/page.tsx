"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Rocket, Video, MessageCircle, Wallet, Smartphone } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

const categoryIcons: Record<string, React.ReactNode> = {
    "시작하기": <Rocket className="w-5 h-5 text-blue-500" />,
    "영상 제작": <Video className="w-5 h-5 text-purple-500" />,
    "피드백": <MessageCircle className="w-5 h-5 text-pink-500" />,
    "정산": <Wallet className="w-5 h-5 text-green-500" />,
    "앱 설치": <Smartphone className="w-5 h-5 text-orange-500" />,
};

interface GuideItem {
    id: string;
    title: string;
    content: string;
    icon: string | null;
    category: string;
}

export default function GuidePage() {
    const user = useAuthStore((s) => s.user);

    const { data, isLoading } = useQuery<{ data: Record<string, GuideItem[]> }>({
        queryKey: ["guide"],
        queryFn: async () => {
            const res = await fetch("/api/guide");
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const categories = data ? Object.keys(data.data) : [];

    return (
        <div className="p-4 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={user?.role === "ADMIN" ? "/admin" : "/stars/dashboard"} className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">📖 사용 가이드</h1>
                    <p className="text-xs text-muted-foreground">별들에게 물어봐 사용법을 알아보세요</p>
                </div>
            </div>

            {/* Quick Navigation */}
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((cat) => (
                        <a
                            key={cat}
                            href={`#guide-${cat}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 text-xs font-medium whitespace-nowrap hover:bg-muted transition-colors"
                        >
                            {categoryIcons[cat] || <BookOpen className="w-4 h-4" />}
                            {cat}
                        </a>
                    ))}
                </div>
            )}

            {/* Sections */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />)}
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-16">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">가이드가 준비 중입니다</p>
                </div>
            ) : (
                categories.map((cat, ci) => (
                    <motion.section
                        key={cat}
                        id={`guide-${cat}`}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ delay: ci * 0.1 }}
                    >
                        {/* Category Header */}
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="p-2 rounded-xl bg-muted/50">{categoryIcons[cat] || <BookOpen className="w-5 h-5" />}</div>
                            <h2 className="text-base font-bold">{cat}</h2>
                        </div>

                        {/* Guide Items */}
                        <div className="space-y-3">
                            {data!.data[cat].map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -12 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 rounded-xl border bg-card"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-sm font-semibold">{item.title}</h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap pl-8">
                                        {item.content}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                ))
            )}
        </div>
    );
}
