"use client";

import { WifiOff, RefreshCcw, Home } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function OfflinePage() {
    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900">
            {/* 떨림 아이콘 */}
            <motion.div
                animate={{
                    rotate: [0, -5, 5, -5, 0],
                    scale: [1, 1.05, 1],
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8 shadow-xl shadow-amber-500/10"
            >
                <WifiOff className="w-12 h-12 text-amber-500" />
            </motion.div>

            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl font-black tracking-tight text-foreground dark:text-foreground mb-3"
            >
                인터넷 연결을 확인해주세요
            </motion.h1>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-muted-foreground max-w-sm mb-10 leading-relaxed"
            >
                네트워크에 연결되어 있지 않습니다.
                Wi-Fi 또는 모바일 데이터를 확인한 후 다시 시도해 주세요.
            </motion.p>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-3"
            >
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                >
                    <RefreshCcw className="w-4 h-4" />
                    다시 시도
                </button>

                <Link
                    href="/stars/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-muted-foreground font-bold hover:bg-muted/50 active:scale-95 transition-all"
                >
                    <Home className="w-4 h-4" />
                    대시보드
                </Link>
            </motion.div>

            {/* 캐시된 페이지 링크 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-12 text-xs text-muted-foreground"
            >
                <p className="mb-3 font-bold uppercase tracking-widest">캐시된 페이지 바로가기</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {[
                        { label: "대시보드", href: "/stars/dashboard" },
                        { label: "피드백", href: "/stars/feedback" },
                        { label: "내 영상", href: "/stars/my-videos" },
                        { label: "수입/정산", href: "/stars/earnings" },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="px-3 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors font-medium"
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
