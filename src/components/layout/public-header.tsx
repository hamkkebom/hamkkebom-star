"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, User, Users, Compass, Search, MessageSquare, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
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

  const isActive = (matchPaths: string[]) =>
    matchPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

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
