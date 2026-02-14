"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/stores/auth-store";

const navLinks: { href: string; label: string; icon: typeof Sparkles; exact?: boolean }[] = [
  // { href: "/stars", label: "스타 소개", icon: Sparkles },  // 임시 비활성화
];

export function PublicHeader() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);



  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">
              함께봄
            </span>
            <span className="ml-0.5 text-muted-foreground">스타</span>
          </span>
        </Link>

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
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
