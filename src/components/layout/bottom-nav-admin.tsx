"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    UserCheck,
    ClipboardList,
    Settings,
    Menu,
    ChevronRight,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { navGroups, colorMap, externalItems } from "@/lib/admin-nav";
import { useQuery } from "@tanstack/react-query";

const navItems = [
    { id: "home", href: "/admin", label: "홈", icon: LayoutDashboard, exact: true },
    { id: "users", href: "/admin/users", label: "가입 승인", icon: UserCheck },
    { id: "reviews", href: "/admin/reviews", label: "리뷰/할당", icon: ClipboardList, isSpecial: true },
    { id: "settings", href: "/admin/settings", label: "설정", icon: Settings },
    { id: "menu", href: "#", label: "전체 메뉴", icon: Menu, isMenu: true },
];

export function BottomNavAdmin() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/auth/login");
    }

    const { data: counts } = useQuery({
        queryKey: ["admin-pending-counts"],
        queryFn: async () => {
            const res = await fetch("/api/notifications/badge");
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            return json.data;
        },
        refetchInterval: 30000,
    });

    const projectApprovalsCount = counts?.pendingApprovals || 0;
    const hasAnyPending = projectApprovalsCount > 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* 관리자 탭은 조금 더 정돈되고 단단한 느낌 유지 */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]" />

            <nav className="relative flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,16px)] pt-2 h-[calc(64px+env(safe-area-inset-bottom,16px))]">
                {navItems.map((item) => {
                    if (item.isMenu) {
                        return (
                            <Sheet key={item.id}>
                                <SheetTrigger asChild>
                                    <button className="relative flex flex-col items-center justify-center w-full h-full">
                                        <motion.div
                                            whileTap={{ scale: 0.9 }}
                                            className="flex flex-col items-center justify-center gap-1 w-full"
                                        >
                                            <div className="relative p-1.5 rounded-xl transition-colors text-muted-foreground">
                                                <item.icon className="h-[22px] w-[22px]" />
                                                {/* 빨간 알림 점 (1단계 유도) */}
                                                {hasAnyPending && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background"
                                                    >
                                                        <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75" />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <span className="text-[10px] tracking-tight mt-0.5 transition-all duration-300 text-muted-foreground font-medium">
                                                {item.label}
                                            </span>
                                        </motion.div>
                                    </button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[85vw] sm:w-[350px] p-0 flex flex-col h-full bg-sidebar border-none z-[100]">
                                    <SheetHeader className="p-5 border-b border-border/50 text-left">
                                        <SheetTitle>전체 메뉴</SheetTitle>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                        {navGroups.map((group) => {
                                            const colors = colorMap[group.color];
                                            return (
                                                <div key={group.id} className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <group.icon className={cn("h-4 w-4", colors.text)} />
                                                        <span className="text-sm font-bold text-foreground">{group.label}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {group.children.map((child) => {
                                                            const isChildActive = pathname === child.href || pathname.startsWith(child.href + "/");
                                                            return (
                                                                <SheetTrigger asChild key={child.href}>
                                                                    <Link
                                                                        href={child.href}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-3 rounded-xl transition-colors",
                                                                            isChildActive
                                                                                ? cn("bg-sidebar-accent font-semibold", colors.text)
                                                                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <child.icon className="h-4 w-4" />
                                                                            <span className="text-sm">{child.label}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {/* 프로젝트 승인 뱃지 (2단계 유도) */}
                                                                            {child.href === "/admin/approvals" && projectApprovalsCount > 0 && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                                    className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                                                                >
                                                                                    {projectApprovalsCount}건 대기
                                                                                </motion.div>
                                                                            )}
                                                                            <ChevronRight className="h-4 w-4 opacity-30" />
                                                                        </div>
                                                                    </Link>
                                                                </SheetTrigger>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="my-4 h-px bg-border/50" />

                                        {/* 외부 링크 및 로그아웃 */}
                                        <div className="space-y-1">
                                            {externalItems.map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                                                >
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.label}</span>
                                                </Link>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={handleLogout}
                                                className="flex w-full items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>로그아웃</span>
                                            </button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        );
                    }

                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    const isSpecial = item.isSpecial;

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center w-full h-full"
                        >
                            {isSpecial ? (
                                // Admin Special Button
                                <div className="absolute bottom-4 flex flex-col items-center">
                                    <motion.div
                                        whileTap={{ scale: 0.95 }}
                                        className={cn(
                                            "relative flex h-12 w-16 items-center justify-center rounded-2xl shadow-md transition-all duration-300",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-primary/30"
                                                : "bg-sidebar-accent border border-sidebar-border text-foreground hover:bg-sidebar-accent/80"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                    </motion.div>
                                    <span className={cn(
                                        "mt-1 text-[10px] font-bold transition-all",
                                        isActive ? "text-primary dark:text-primary-foreground" : "text-foreground"
                                    )}>
                                        {item.label}
                                    </span>
                                </div>
                            ) : (
                                // Admin Standard Icons
                                <motion.div
                                    whileTap={{ scale: 0.9 }}
                                    className="flex flex-col items-center justify-center gap-1 w-full"
                                >
                                    <div className={cn(
                                        "p-1.5 rounded-xl transition-colors",
                                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                    )}>
                                        <item.icon className="h-[22px] w-[22px]" />
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] tracking-tight mt-0.5 transition-all duration-300",
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
