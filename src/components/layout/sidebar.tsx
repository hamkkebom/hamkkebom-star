"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Film,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/stars/my-videos", label: "내 영상 관리", icon: Film },
  { href: "/stars/upload", label: "영상 업로드", icon: Upload },
  { href: "/stars/feedback", label: "피드백 확인", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const { data: userData } = useQuery({
    queryKey: ["sidebar-user"],
    queryFn: async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { name: string; email: string } };
      return json.data;
    },
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-14 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
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
      </nav>

      {/* Bottom nav */}
      <div className="space-y-1 border-t px-3 py-3">
        {userData && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium truncate">{userData.name}</p>
            <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
          </div>
        )}
        <Link
          href="/stars/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            pathname.startsWith("/stars/settings")
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-0.5"
          )}
        >
          <Settings className={cn("h-4 w-4", pathname.startsWith("/stars/settings") && "text-primary")} />
          설정
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
