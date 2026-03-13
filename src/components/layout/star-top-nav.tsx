"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clapperboard,
  Compass,
  User,
  Wallet,
  Menu,
  Smartphone,
  ExternalLink,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { ExploreSubTabs, WorkspaceSubTabs } from "@/components/layout/star-sub-tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";

const Header = dynamic(
  () => import("@/components/layout/header").then((m) => ({ default: m.Header })),
  {
    ssr: false,
    loading: () => (
      <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 md:px-6" />
    ),
  }
);

type NavCounts = {
  pendingApplications: number;
  activeProjects: number;
  unreadFeedbacks: number;
};

const TABS = [
  {
    id: "workspace",
    label: "작업실",
    icon: Clapperboard,
    href: "/stars/dashboard",
    match: ["/stars/dashboard", "/stars/my-videos", "/stars/upload", "/stars/feedback"],
  },
  {
    id: "explore",
    label: "탐색",
    icon: Compass,
    href: "/stars/project-board",
    match: ["/stars/project-board", "/stars/request-detail", "/stars/my-applications", "/stars/active-projects"],
  },
  {
    id: "profile",
    label: "프로필",
    icon: User,
    href: "/stars/portfolio",
    match: ["/stars/portfolio", "/stars/profile"],
  },
  {
    id: "earnings",
    label: "수익",
    icon: Wallet,
    href: "/stars/earnings",
    match: ["/stars/earnings"],
  },
];

const MENU_ITEMS = [
  { href: "/stars/install", label: "앱 설치 · 설정", icon: Smartphone },
  { href: "/", label: "메인으로 돌아가기", icon: ExternalLink },
];

export function StarTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const { data: navCounts } = useQuery<NavCounts>({
    queryKey: ["star-nav-counts"],
    queryFn: async () => {
      const res = await fetch("/api/stars/nav-counts");
      if (!res.ok) return { pendingApplications: 0, activeProjects: 0, unreadFeedbacks: 0 };
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // 탐색 탭 배지: 지원 대기 + 진행중
  const exploreBadge = (navCounts?.pendingApplications ?? 0) + (navCounts?.activeProjects ?? 0);
  // 작업실 탭 배지: 미확인 피드백
  const workspaceBadge = navCounts?.unreadFeedbacks ?? 0;

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  };

  const activeTabId = TABS.find((tab) => isActive(tab.match))?.id;

  return (
    <>
      {/* Desktop & Mobile Top Header */}
      <Header isAdmin={false}>
        {/* Desktop Tabs (rendered as children in Header) */}
        <nav className="flex h-full items-center gap-1">
          {TABS.map((tab) => {
            const active = isActive(tab.match);
            const Icon = tab.icon;
            const badge =
              tab.id === "explore"
                ? exploreBadge
                : tab.id === "workspace"
                  ? workspaceBadge
                  : 0;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "relative flex h-full items-center gap-2 px-4 text-sm font-medium transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>

                {badge > 0 && (
                  <span className={cn(
                    "ml-1 flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold text-white px-1",
                    tab.id === "workspace" ? "bg-rose-500" : "bg-violet-500"
                  )}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}

                {active && (
                  <motion.div
                    layoutId="desktop-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </Header>

      {/* Sub-tabs (Desktop + Mobile) */}
      {activeTabId === "explore" && <ExploreSubTabs />}
      {activeTabId === "workspace" && <WorkspaceSubTabs />}

      {/* Mobile Bottom Nav — 5탭: 작업실 · 탐색 · 프로필 · 수익 · 전체 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)]">
        {TABS.map((tab) => {
          const active = isActive(tab.match);
          const Icon = tab.icon;
          const badge =
            tab.id === "explore"
              ? exploreBadge
              : tab.id === "workspace"
                ? workspaceBadge
                : 0;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 h-full transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className={cn(
                    "absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full text-[8px] font-bold text-white px-0.5",
                    tab.id === "workspace" ? "bg-rose-500" : "bg-violet-500"
                  )}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>

              {active && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute bottom-1 h-1 w-1 rounded-full bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* 전체 메뉴 탭 */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative flex flex-1 flex-col items-center justify-center gap-1 h-full transition-colors text-muted-foreground hover:text-foreground">
              <motion.div whileTap={{ scale: 0.9 }}>
                <Menu className="h-5 w-5" />
              </motion.div>
              <span className="text-[10px] font-medium">전체</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[350px] p-0 flex flex-col h-full bg-sidebar border-none z-[100]">
            <SheetHeader className="p-5 border-b border-border/50 text-left">
              <SheetTitle>전체 메뉴</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {MENU_ITEMS.map((item) => (
                <SheetTrigger asChild key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-30" />
                  </Link>
                </SheetTrigger>
              ))}

              <div className="my-4 h-px bg-border/50" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 p-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
