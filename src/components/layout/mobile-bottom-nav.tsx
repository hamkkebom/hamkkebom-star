"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, User, MoreHorizontal, Bell, HelpCircle, BookOpen, Star, Film, Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { href: "/", label: "홈", icon: Home, exact: true },
    { href: "/videos", label: "영상", icon: Film },
    { href: "/community", label: "커뮤니티", icon: Users },
];

const moreMenu = [
    { href: "/announcements", label: "공지사항", icon: Bell },
    { href: "/faq", label: "FAQ", icon: HelpCircle },
    { href: "/guide", label: "사용 가이드", icon: BookOpen },
    { href: "/stars", label: "크리에이터 목록", icon: Star },
    { href: "/explore", label: "통합 검색", icon: Search },
];

export function MobileBottomNav() {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);
    const [sheetOpen, setSheetOpen] = useState(false);

    // 관리자/스타 대시보드에서는 숨김
    if (pathname.startsWith("/admin") || pathname.startsWith("/stars/")) return null;

    const myHref = !isLoading && user
        ? user.role === "ADMIN" ? "/admin" : "/stars/dashboard"
        : "/auth/login";
    const isMyActive = pathname.startsWith("/stars") || pathname.startsWith("/admin") || pathname === "/auth/login";

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90"
                        >
                            <div className="relative flex flex-col items-center gap-1 z-10">
                                <motion.div
                                    animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    className={`relative ${isActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-violet-500/30 blur-md rounded-full -m-1" />
                                    )}
                                    <Icon className={`w-5 h-5 relative z-10 ${isActive ? "stroke-[2.5]" : ""}`} />
                                </motion.div>
                                <motion.span
                                    animate={isActive ? { opacity: 1, y: -1 } : { opacity: 0.8, y: 0 }}
                                    className={`text-[10px] font-bold ${isActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                                >
                                    {item.label}
                                </motion.span>
                            </div>
                        </Link>
                    );
                })}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <button className="relative flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90 outline-none">
                            <div className="relative flex flex-col items-center gap-1 z-10">
                                <motion.div
                                    animate={sheetOpen ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    className={`relative ${sheetOpen ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                                >
                                    {sheetOpen && (
                                        <div className="absolute inset-0 bg-violet-500/30 blur-md rounded-full -m-1" />
                                    )}
                                    <MoreHorizontal className={`w-5 h-5 relative z-10 ${sheetOpen ? "stroke-[2.5]" : ""}`} />
                                </motion.div>
                                <motion.span
                                    animate={sheetOpen ? { opacity: 1, y: -1 } : { opacity: 0.8, y: 0 }}
                                    className={`text-[10px] font-bold ${sheetOpen ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                                >
                                    더보기
                                </motion.span>
                            </div>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-3xl pb-10">
                        <SheetHeader className="text-left mb-4">
                            <SheetTitle className="text-xl font-bold">더보기</SheetTitle>
                        </SheetHeader>
                        <div className="grid grid-cols-4 gap-2">
                            {moreMenu.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSheetOpen(false)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 active:scale-95 transition-all"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 shadow-sm text-foreground">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-center select-none text-muted-foreground">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>

                <Link
                    href={myHref}
                    className="relative flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90"
                >
                    <div className="relative flex flex-col items-center gap-1 z-10">
                        <motion.div
                            animate={isMyActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className={`relative ${isMyActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                        >
                            {isMyActive && (
                                <div className="absolute inset-0 bg-violet-500/30 blur-md rounded-full -m-1" />
                            )}
                            <User className={`w-5 h-5 relative z-10 ${isMyActive ? "stroke-[2.5]" : ""}`} />
                        </motion.div>
                        <motion.span
                            animate={isMyActive ? { opacity: 1, y: -1 } : { opacity: 0.8, y: 0 }}
                            className={`text-[10px] font-bold ${isMyActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                        >
                            마이
                        </motion.span>
                    </div>
                </Link>
            </div>
        </nav>
    );
}
