"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Clapperboard,
  Film,
  UsersRound,
  UserCheck,
  Users,
  Wallet,
  DollarSign,
  ExternalLink,
  LogOut,
  User,
  ChevronDown,
  UserCog,
  PenTool,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Share2,
  BookOpen,
  TrendingUp,
  Activity,
  BadgeDollarSign,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

import { NavChild, NavGroup, navGroups, colorMap, externalItems } from "@/lib/admin-nav";

// --- 아코디언 그룹 컴포넌트 ---
function SidebarGroup({
  group,
  isOpen,
  onToggle,
  pathname,
  pendingCounts,
}: {
  group: NavGroup;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  pendingCounts?: Record<string, number>;
}) {
  const colors = colorMap[group.color];
  const matchChild = (c: NavChild) => c.exact ? pathname === c.href : (pathname === c.href || pathname.startsWith(c.href + "/"));
  const hasActiveChild = group.children.some(matchChild);
  // 가장 구체적인(긴) 매칭 href 찾기 — 부모/자식 경로 중복 활성화 방지
  const activeHref = group.children
    .filter(matchChild)
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="relative">
      {/* 그룹 헤더 */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group/header",
          "hover:bg-sidebar-accent/40",
          isOpen && colors.bg,
          hasActiveChild && !isOpen && "bg-sidebar-accent/20",
        )}
      >
        {/* 활성 그룹 좌측 글로우 바 */}
        <AnimatePresence>
          {hasActiveChild && (
            <motion.span
              layoutId="group-indicator"
              className={cn(
                "absolute left-0 top-2 bottom-2 w-[3px] rounded-full",
                colors.dot,
                colors.glow,
              )}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
        </AnimatePresence>

        <group.icon
          className={cn(
            "h-[18px] w-[18px] transition-all duration-300",
            hasActiveChild || isOpen
              ? colors.text
              : "text-muted-foreground group-hover/header:text-foreground",
          )}
        />
        <span
          className={cn(
            "flex-1 text-left tracking-wide transition-colors duration-300",
            hasActiveChild || isOpen
              ? "text-foreground"
              : "text-muted-foreground group-hover/header:text-foreground",
          )}
        >
          {group.label}
        </span>

        {/* 그룹 레벨 승인 대기 뱃지 */}
        {group.id === "project" && (pendingCounts?.pendingApprovals ?? 0) > 0 && (
          <span className="mr-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-foreground shadow-sm animate-pulse">
            {pendingCounts!.pendingApprovals}
          </span>
        )}

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex flex-shrink-0"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-colors duration-300",
              isOpen ? colors.text : "text-muted-foreground/50",
            )}
          />
        </motion.span>
      </button>

      {/* 하위 메뉴 (아코디언) */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "spring", stiffness: 400, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden"
          >
            <div className="relative ml-[18px] pl-4 py-1.5">
              {/* 트리 연결선 */}
              <div
                className={cn(
                  "absolute left-[8px] top-0 bottom-0 w-px border-l border-dashed",
                  colors.line,
                )}
              />

              <div className="space-y-0.5">
                {group.children.map((child, childIdx) => {
                  const isActive = child.href === activeHref;
                  return (
                    <motion.div
                      key={child.href}
                      initial={{ x: -8, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{
                        delay: childIdx * 0.05,
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <Link
                        href={child.href}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                          isActive
                            ? cn(
                              "bg-sidebar-accent text-foreground font-semibold",
                            )
                            : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground hover:translate-x-0.5",
                        )}
                      >
                        {/* 트리 브랜치 도트 */}
                        <div
                          className={cn(
                            "absolute -left-[19px] top-1/2 -translate-y-1/2 w-2 h-px border-t border-dashed",
                            colors.line,
                          )}
                        />
                        <div
                          className={cn(
                            "absolute -left-[12px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border transition-all duration-300",
                            isActive
                              ? cn(colors.dot, "border-transparent scale-125", colors.glow)
                              : cn("border-muted-foreground/30 bg-background"),
                          )}
                        />

                        <child.icon
                          className={cn(
                            "h-3.5 w-3.5 transition-colors duration-200",
                            isActive ? colors.text : "text-muted-foreground/70",
                          )}
                        />
                        <span className="flex-1">{child.label}</span>
                        {/* 승인 대기 뱃지 */}
                        {child.href === "/admin/approvals" && (pendingCounts?.pendingApprovals ?? 0) > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/20 shadow-[0_0_6px_rgba(244,63,94,0.25)] animate-pulse">
                            {pendingCounts!.pendingApprovals}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- 메인 사이드바 ---
export function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();

  // pathname 기반 자동 펼침: 해당 그룹 ID 찾기
  const findActiveGroupId = () => {
    for (const group of navGroups) {
      if (group.children.some((c) => c.exact ? pathname === c.href : pathname.startsWith(c.href))) {
        return group.id;
      }
    }
    return null;
  };

  const [openGroupId, setOpenGroupId] = useState<string | null>(findActiveGroupId);

  // pathname 변경 시 자동으로 해당 그룹 펼침
  useEffect(() => {
    const activeId = findActiveGroupId();
    if (activeId) setOpenGroupId(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleToggle = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const { data: userData } = useQuery({
    queryKey: ["admin-sidebar-user"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { name: string; email: string; avatarUrl?: string | null } };
      return json.data;
    },
  });

  const { data: badgeData } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/badge");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as Record<string, number>;
    },
    refetchInterval: 30000,
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    // 전체 페이지 리로드로 모든 클라이언트 상태(TanStack Query, Zustand) 완전 초기화
    window.location.href = "/auth/login";
  }

  const isDashboardActive = pathname === "/admin";

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* 브랜드 헤더 */}
      <div className="flex h-14 items-center px-5">
        <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95 duration-300">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
            <span className="text-foreground font-extrabold text-xs">관</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              별들에게 물어봐
            </span>
            <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">
              Admin Console
            </span>
          </div>
        </Link>
      </div>

      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* 그룹 메뉴 */}
        <div className="space-y-1">
          {navGroups.map((group) => (
            <SidebarGroup
              key={group.id}
              group={group}
              isOpen={openGroupId === group.id}
              onToggle={() => handleToggle(group.id)}
              pathname={pathname}
              pendingCounts={badgeData ?? undefined}
            />
          ))}
        </div>

        {/* 구분선 */}
        <div className="mx-1 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent !mt-4 !mb-2" />

        {/* 외부 링크 */}
        {externalItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/80 hover:text-foreground hover:bg-primary/5 border border-dashed border-transparent hover:border-primary/20 transition-all duration-300 group"
          >
            <item.icon className="h-4 w-4 text-primary/50 group-hover:text-primary transition-colors" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 하단: 프로필 + 로그아웃 */}
      <div className="px-3 py-4 space-y-2 relative mt-auto border-t border-border/50">
        {/* 시스템 업데이트 (NEW!) */}
        <Link
          href="/admin/updates"
          className="flex items-center justify-between px-3 py-2.5 mb-1 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-amber-700 dark:text-amber-300 hover:from-amber-500/20 hover:to-amber-500/5 transition-all duration-300 group"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span className="text-xs font-bold tracking-tight">업데이트 노트</span>
          </div>
          <span className="text-[9px] font-bold bg-amber-500 text-foreground px-1.5 py-0.5 rounded-full shadow-sm group-hover:scale-105 transition-transform">
            NEW
          </span>
        </Link>

        {userData && (
          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border hover:bg-sidebar-accent/50 transition-colors group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 p-[1px] relative">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {userData.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userData.avatarUrl} alt={userData.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background shadow-sm">
                ADMIN
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{userData.name}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-sm font-bold">관리자</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{userData.email}</p>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-transparent transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
