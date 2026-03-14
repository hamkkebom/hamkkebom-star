"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBadge } from "@/components/layout/notification-badge";
import { Button } from "@/components/ui/button";
import { Sparkles, User, Settings, Smartphone, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({ isAdmin = false, children }: { isAdmin?: boolean, children?: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();

  const { data: userData } = useQuery({
    queryKey: ["header-user"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { name: string; email: string } };
      return json.data;
    },
    enabled: !isAdmin,
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    // 전체 페이지 리로드로 모든 클라이언트 상태(TanStack Query, Zustand) 완전 초기화
    window.location.href = "/auth/login";
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 z-30 relative">
      {/* Left: Brand Logo (only for STAR) */}
      {!isAdmin && (
        <div className="flex items-center md:w-[200px]">
          <Link href="/" className="group flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 duration-300">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight text-foreground">별들에게 물어봐</span>
          </Link>
        </div>
      )}

      {/* Center: Tabs (passed as children from StarTopNav) */}
      {!isAdmin && children && (
        <div className="hidden md:flex flex-1 justify-center h-full">
          {children}
        </div>
      )}

      {/* Right: Notifications + Avatar */}
      <div className="flex items-center gap-2 ml-auto md:w-[200px] justify-end">
        <NotificationBadge />
        
        {!isAdmin && (
          <div className="hidden md:block ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-primary/10 hover:bg-primary/20 border border-border">
                  <User className="h-4 w-4 text-primary" />
                  <span className="sr-only">사용자 메뉴</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{userData?.name || "사용자"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userData?.email || "로딩 중..."}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/stars/settings" className="cursor-pointer flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>설정</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/stars/install" className="cursor-pointer flex items-center">
                    <Smartphone className="mr-2 h-4 w-4" />
                    <span>앱 설치</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}
