"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    Clapperboard,
    Rocket,
    MessageCircleHeart,
    User,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const navItems = [
    { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
    { href: "/stars/my-videos", label: "내 영상", icon: Clapperboard },
    { href: "/stars/upload", label: "새 작업", icon: Rocket, isSpecial: true },
    { href: "/stars/feedback", label: "피드백", icon: MessageCircleHeart },
    { href: "/stars/settings", label: "내 정보", icon: User },
];

export function BottomNavStar() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* 바텀 네비게이션 컨테이너 블러 및 그라데이션 */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-t border-border/50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.3)]" />

            {/* 하단 세이프 영역 확보 (iOS 등) */}
            <nav className="relative flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,16px)] pt-2 h-[calc(64px+env(safe-area-inset-bottom,16px))]">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const isSpecial = item.isSpecial;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-full h-full"
                        >
                            {isSpecial ? (
                                // Special "New Action" FAB Button (Floating Action Button)
                                <div className="absolute bottom-4 flex flex-col items-center">
                                    <motion.div
                                        whileTap={{ scale: 0.9 }}
                                        animate={{ y: isActive ? -4 : 0 }}
                                        className={cn(
                                            "relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-colors",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-primary/40"
                                                : "bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white shadow-violet-500/30"
                                        )}
                                    >
                                        <item.icon className="h-6 w-6 relative z-10" />

                                        {/* 상시 반짝임 효과 */}
                                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                                        {!isActive && (
                                            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
                                        )}
                                    </motion.div>
                                    <span className={cn(
                                        "mt-1 text-[10px] font-bold text-violet-500 tracking-tight transition-all",
                                        isActive ? "opacity-100" : "opacity-80"
                                    )}>
                                        {item.label}
                                    </span>
                                </div>
                            ) : (
                                // Standard Icon Buttons
                                <motion.div
                                    className="flex flex-col items-center justify-center gap-1 w-full"
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <div className="relative">
                                        <item.icon
                                            className={cn(
                                                "h-6 w-6 transition-all duration-300",
                                                isActive
                                                    ? "text-primary scale-110"
                                                    : "text-muted-foreground"
                                            )}
                                        />
                                        {/* 활성 상태 닷(Dot) 인디케이터 */}
                                        {isActive && (
                                            <motion.div
                                                layoutId="star-nav-indicator"
                                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.6)]"
                                            />
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] tracking-tight mt-1 transition-all duration-300",
                                            isActive
                                                ? "text-primary font-bold"
                                                : "text-muted-foreground font-medium"
                                        )}
                                    >
                                        {item.label}
                                    </span>
                                </motion.div>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
