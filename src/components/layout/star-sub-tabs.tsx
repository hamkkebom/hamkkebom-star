"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutList,
  Send,
  Zap,
  LayoutDashboard,
  Film,
  MessageCircleHeart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types & Hooks ─────────────────────────────────────

type NavCounts = {
  pendingApplications: number;
  activeProjects: number;
  unreadFeedbacks: number;
};

function useNavCounts() {
  return useQuery<NavCounts>({
    queryKey: ["star-nav-counts"],
    queryFn: async () => {
      const res = await fetch("/api/stars/nav-counts");
      if (!res.ok) return { pendingApplications: 0, activeProjects: 0, unreadFeedbacks: 0 };
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ─── Tab Definitions ───────────────────────────────────

type SubTab = {
  id: string;
  label: string;
  href: string;
  match: string[];
  icon: LucideIcon;
  badgeKey?: keyof NavCounts;
  badgeColor?: string;
};

const EXPLORE_TABS: SubTab[] = [
  {
    id: "board",
    label: "의뢰 게시판",
    href: "/stars/project-board",
    match: ["/stars/project-board", "/stars/request-detail"],
    icon: LayoutList,
  },
  {
    id: "applications",
    label: "지원한 의뢰",
    href: "/stars/my-applications",
    match: ["/stars/my-applications"],
    icon: Send,
    badgeKey: "pendingApplications",
    badgeColor: "bg-amber-500",
  },
  {
    id: "active",
    label: "진행 중",
    href: "/stars/active-projects",
    match: ["/stars/active-projects"],
    icon: Zap,
    badgeKey: "activeProjects",
    badgeColor: "bg-violet-500",
  },
];

const WORKSPACE_TABS: SubTab[] = [
  {
    id: "dashboard",
    label: "대시보드",
    href: "/stars/dashboard",
    match: ["/stars/dashboard"],
    icon: LayoutDashboard,
  },
  {
    id: "videos",
    label: "내 영상",
    href: "/stars/my-videos",
    match: ["/stars/my-videos", "/stars/upload"],
    icon: Film,
  },
  {
    id: "feedback",
    label: "피드백",
    href: "/stars/feedback",
    match: ["/stars/feedback"],
    icon: MessageCircleHeart,
    badgeKey: "unreadFeedbacks",
    badgeColor: "bg-rose-500",
  },
];

// ─── iOS Segmented Control ─────────────────────────────
// 리서치 기반: Apple Music / 네이버 스타일 세그먼트 컨트롤
// - 회색 컨테이너가 서브탭 영역을 명확히 정의
// - 흰색 활성 세그먼트 + 그림자로 즉시 눈에 띔
// - 아이콘 + 텍스트 + 배지로 정보 밀도 최적화

function SegmentedControl({ tabs, layoutId }: { tabs: SubTab[]; layoutId: string }) {
  const pathname = usePathname();
  const { data: counts } = useNavCounts();

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );
  };

  return (
    <div className="w-full bg-card/80 px-4 py-1.5 md:px-6 border-b border-border/80 backdrop-blur-md">
        <div className="flex items-center rounded-lg bg-secondary/80 p-1 gap-1 max-w-lg">
        {tabs.map((tab) => {
          const active = isActive(tab.match);
          const badgeCount = tab.badgeKey && counts ? counts[tab.badgeKey] : 0;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="relative flex-1 min-w-0 group"
            >
              {/* 활성 배경 — 애니메이션 pill */}
              {active && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-md bg-accent border border-violet-500/20 shadow-sm shadow-[0_0_12px_rgba(139,92,246,0.1)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  style={{
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
                  }}
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 select-none",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors",
                  active 
                    ? "text-violet-400" 
                    : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="truncate">{tab.label}</span>

                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white leading-none shrink-0 shadow-sm",
                      tab.badgeColor ?? "bg-primary",
                    )}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Exports ───────────────────────────────────────────

export function ExploreSubTabs() {
  return <SegmentedControl tabs={EXPLORE_TABS} layoutId="explore-segment" />;
}

export function WorkspaceSubTabs() {
  return <SegmentedControl tabs={WORKSPACE_TABS} layoutId="workspace-segment" />;
}
