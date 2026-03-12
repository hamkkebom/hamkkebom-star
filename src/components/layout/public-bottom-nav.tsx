"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Users, MessageSquare, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const TABS = [
  {
    id: "explore",
    label: "탐색",
    icon: Compass,
    href: "/videos",
    match: ["/videos", "/best", "/categories", "/showcase", "/explore"],
  },
  {
    id: "creators",
    label: "크리에이터",
    icon: Users,
    href: "/stars",
    match: ["/stars", "/recruit", "/counselors"],
  },
  {
    id: "community",
    label: "커뮤니티",
    icon: MessageSquare,
    href: "/community",
    match: ["/community"],
  },
];

const LIBRARY_TAB = {
  id: "library",
  label: "라이브러리",
  icon: BookOpen,
  href: "/library",
  match: ["/library", "/likes", "/bookmarks", "/following", "/followers"],
};

export function PublicBottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  };

  const tabs = user ? [...TABS, LIBRARY_TAB] : TABS;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)]">
      {tabs.map((tab) => {
        const active = isActive(tab.match);
        const Icon = tab.icon;
        
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
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
            
            {active && (
              <motion.div
                layoutId="public-nav-indicator"
                className="absolute bottom-1 h-1 w-1 rounded-full bg-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
