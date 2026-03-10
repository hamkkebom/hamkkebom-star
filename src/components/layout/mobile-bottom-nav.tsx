"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, User } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
    { href: "/", label: "홈", icon: Home, exact: true },
    { href: "/explore", label: "탐색", icon: Compass },
    { href: "/community", label: "커뮤니티", icon: Users },
];

export function MobileBottomNav() {
    const pathname = usePathname();
    const user = useAuthStore((s) => s.user);
    const isLoading = useAuthStore((s) => s.isLoading);

    // 관리자/스타 대시보드에서는 숨김
    if (pathname.startsWith("/admin") || pathname.startsWith("/stars/")) return null;

    const myHref = !isLoading && user
        ? user.role === "ADMIN" ? "/admin" : "/stars/dashboard"
        : "/auth/login";

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg md:hidden safe-area-bottom">
            <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-90 ${isActive
                                    ? "text-violet-600 dark:text-violet-400"
                                    : "text-muted-foreground"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </Link>
                    );
                })}
                <Link
                    href={myHref}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-90 ${pathname.startsWith("/stars") || pathname.startsWith("/admin") || pathname === "/auth/login"
                            ? "text-violet-600 dark:text-violet-400"
                            : "text-muted-foreground"
                        }`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-bold">마이</span>
                </Link>
            </div>
        </nav>
    );
}
