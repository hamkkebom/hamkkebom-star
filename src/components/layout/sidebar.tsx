"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { type LucideIcon,
  LayoutDashboard,
  Clapperboard, // More vibrant than Film
  Rocket,
  MessageCircleHeart, // Friendlier than MessageSquare
  Settings,
  LogOut,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isSpecial?: boolean;
}

const navItems: NavItem[] = [
  { href: "/stars/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/stars/my-videos", label: "내 영상 관리", icon: Clapperboard }, // Updated Icon
  {
    href: "/stars/upload",
    label: "프로젝트 찾기 & 제출",
    icon: Rocket,
    isSpecial: true
  },
  { href: "/stars/feedback", label: "피드백 확인", icon: MessageCircleHeart }, // Updated Icon
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
        <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 duration-300">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <span className="text-white font-extrabold text-sm group-hover:animate-spin-slow">봄</span>
            <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">별들에게 물어봐</span>
          </div>
        </Link>
      </div>
      <Separator />

      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isSpecial = item.isSpecial;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative overflow-hidden",
                isSpecial
                  ? cn(
                    "my-3 border border-transparent",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]"
                      : "bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 hover:from-violet-500/10 hover:via-purple-500/10 hover:to-fuchsia-500/10 hover:scale-[1.02] hover:shadow-md hover:border-primary/20 text-foreground"
                  )
                  : cn(
                    "relative overflow-hidden group/item", // Added group/item for internal animations
                    isActive
                      ? "bg-sidebar-accent/60 text-foreground font-semibold"
                      : "text-muted-foreground/80 hover:bg-sidebar-accent/40 hover:text-foreground hover:translate-x-1"
                  )
              )}
            >
              {/* Special Item Effects */}
              {isSpecial && !isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-shine z-0" />
              )}

              {/* Standard Active Indicator */}
              {!isSpecial && isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
              )}

              <item.icon className={cn(
                "h-4 w-4 relative z-10 transition-transform duration-300",
                isSpecial && "h-5 w-5",
                isActive && isSpecial ? "animate-pulse" : "",
                !isActive && isSpecial ? "text-purple-500 group-hover:scale-110 group-hover:rotate-6" : "",
                !isSpecial && isActive ? "text-primary scale-110" : "text-muted-foreground group-hover/item:text-foreground group-hover/item:scale-110",
                !isSpecial && "ml-1" // Adjust spacing for standard items with indicator
              )} />

              <span className={cn("relative z-10 transition-colors duration-300", isSpecial && "font-bold tracking-tight")}>
                {item.label}
              </span>

              {isSpecial && (
                <Sparkles className={cn(
                  "absolute right-2 h-4 w-4 opacity-0 transition-all duration-300",
                  isActive ? "text-white/70 opacity-100 animate-spin-slow" : "text-purple-500/50 group-hover:opacity-100 group-hover:scale-125"
                )} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 space-y-2 relative">
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {userData && (
          <Link href="/stars/settings" className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border hover:bg-sidebar-accent/50 transition-colors group cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 p-[1px]">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{userData.name}</p>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{userData.email}</p>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/stars/settings"
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium transition-all duration-200 border border-transparent",
              pathname.startsWith("/stars/settings")
                ? "bg-primary/10 text-primary border-primary/20 shadow-inner"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground hover:border-sidebar-border"
            )}
          >
            <Settings className={cn("h-4 w-4 mb-0.5", pathname.startsWith("/stars/settings") && "animate-spin-slow")} />
            설정
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-transparent transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mb-0.5" />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
