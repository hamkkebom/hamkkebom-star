"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  User,
  Users,
  Compass,
  Search,
  MessageSquare,
  Library,
  LayoutDashboard,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths: string[];
};

const navLinks: NavLink[] = [
  {
    href: "/videos",
    label: "탐색",
    icon: Compass,
    matchPaths: ["/videos", "/best", "/categories", "/showcase", "/explore"],
  },
  {
    href: "/stars",
    label: "크리에이터",
    icon: Users,
    matchPaths: ["/stars", "/recruit", "/counselors"],
  },
  {
    href: "/community",
    label: "커뮤니티",
    icon: MessageSquare,
    matchPaths: ["/community"],
  },
];

export function PublicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const supabase = createClient();

  const isActive = (matchPaths: string[]) =>
    matchPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/stars/dashboard";
  const settingsHref = user?.role === "ADMIN" ? "/admin/settings" : "/stars/settings";

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight md:block">
            <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              별들에게
            </span>
            <span className="ml-1 text-muted-foreground">물어봐</span>
          </span>
        </a>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex h-full">
          {navLinks.map((link) => {
            const active = isActive(link.matchPaths);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-4 text-sm font-medium transition-colors",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                )}
              </Link>
            );
          })}
          {user && (() => {
            const libraryActive = isActive(["/library", "/likes", "/bookmarks", "/following", "/followers"]);
            return (
              <Link
                href="/library"
                className={cn(
                  "relative flex h-full items-center gap-1.5 px-4 text-sm font-medium transition-colors",
                  libraryActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Library className="h-4 w-4" />
                라이브러리
                {libraryActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                )}
              </Link>
            );
          })()}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/explore" className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors hidden sm:flex">
            <Search className="w-5 h-5" />
          </Link>

          {isLoading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          ) : user === null ? (
            <Link href="/auth/login">
              <Button size="sm" className="gap-1.5 rounded-full px-4">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">로그인</span>
              </Button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary/50"
                >
                  <Avatar className="h-9 w-9">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">사용자 메뉴</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-0" sideOffset={8}>
                {/* 유저 정보 헤더 */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  <Avatar className="h-10 w-10 shrink-0">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0",
                        user.role === "ADMIN"
                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                          : "bg-violet-500/15 text-violet-400 border border-violet-500/20"
                      )}>
                        {user.role === "ADMIN" && <Shield className="h-2.5 w-2.5" />}
                        {user.role === "ADMIN" ? "관리자" : "STAR"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {/* 메뉴 항목 */}
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link href={dashboardHref} className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      <span>마이페이지</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={settingsHref} className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>설정</span>
                    </Link>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-0" />

                {/* 로그아웃 */}
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
