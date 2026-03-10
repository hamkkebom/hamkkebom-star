"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, User, Users, Compass, Search, MoreHorizontal, Bell, HelpCircle, BookOpen, Star, FileText, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/stores/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const navLinks: { href: string; label: string; icon: any; exact?: boolean }[] = [
  { href: "/", label: "홈", icon: Sparkles, exact: true },
  { href: "/videos", label: "영상", icon: Film },
  { href: "/community", label: "커뮤니티", icon: Users },
];

export function PublicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo - Force reload to reset state */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight md:block">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              함께봄
            </span>
            <span className="ml-0.5 text-muted-foreground">스타</span>
          </span>
        </a>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                <MoreHorizontal className="h-4 w-4" />
                더보기
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl p-2 z-[100]">
              <DropdownMenuItem asChild className="rounded-md cursor-pointer text-sm font-medium hover:bg-accent/50 focus:bg-accent focus:text-accent-foreground text-zinc-700 dark:text-zinc-300 py-2">
                <Link href="/announcements"><Bell className="mr-2 h-4 w-4" /> 📢 공지사항</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md cursor-pointer text-sm font-medium hover:bg-accent/50 focus:bg-accent focus:text-accent-foreground text-zinc-700 dark:text-zinc-300 py-2">
                <Link href="/faq"><HelpCircle className="mr-2 h-4 w-4" /> ❓ FAQ</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-md cursor-pointer text-sm font-medium hover:bg-accent/50 focus:bg-accent focus:text-accent-foreground text-zinc-700 dark:text-zinc-300 py-2">
                <Link href="/guide"><BookOpen className="mr-2 h-4 w-4" /> 📖 가이드</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem asChild className="rounded-md cursor-pointer text-sm font-medium hover:bg-accent/50 focus:bg-accent focus:text-accent-foreground text-zinc-700 dark:text-zinc-300 py-2">
                <Link href="/stars"><Star className="mr-2 h-4 w-4" /> 🌟 크리에이터 목록</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem asChild className="rounded-md cursor-pointer text-sm font-medium hover:bg-accent/50 focus:bg-accent focus:text-accent-foreground text-zinc-700 dark:text-zinc-300 py-2">
                <Link href="/explore"><Search className="mr-2 h-4 w-4" /> 🔍 통합 검색</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/explore" className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors hidden sm:flex">
            <Search className="w-5 h-5" />
          </Link>
          <ThemeToggle />
          {isLoading ? null : user === null ? (
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="gap-1.5">
                <span className="hidden sm:inline">로그인</span>
              </Button>
            </Link>
          ) : (
            <Link href={user.role === "ADMIN" ? "/admin" : "/stars/dashboard"}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">마이페이지</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
