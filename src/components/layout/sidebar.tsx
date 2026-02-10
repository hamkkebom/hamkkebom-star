"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Film,
  Upload,
  MessageSquare,
  DollarSign,
  Briefcase,
  Play,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/stars/project-board", label: "제작요청 게시판", icon: ClipboardList },
  { href: "/stars/my-videos", label: "내 영상 관리", icon: Film },
  { href: "/stars/upload", label: "영상 업로드", icon: Upload },
  { href: "/stars/feedback", label: "피드백 확인", icon: MessageSquare },
  { href: "/stars/earnings", label: "정산 내역", icon: DollarSign },
  { href: "/stars/portfolio", label: "포트폴리오", icon: Briefcase },
];

const externalItems = [
  { href: "/videos", label: "영상 브라우저", icon: Play },
];

const bottomItems = [
  { href: "/stars/profile", label: "프로필", icon: User },
  { href: "/stars/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center px-6">
        <Link href="/stars/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            봄
          </span>
          <span className="text-lg font-bold text-sidebar-foreground">별들에게 물어봐</span>
        </Link>
      </div>
      <Separator />

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}

        <Separator className="my-3" />

        {externalItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="space-y-1 border-t px-3 py-3">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
