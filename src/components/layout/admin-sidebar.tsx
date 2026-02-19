"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  Eye,
  Film,
  Users,
  UserCheck,
  DollarSign,
  Play,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/admin/requests", label: "제작요청 관리", icon: ClipboardList },
  { href: "/admin/reviews", label: "영상 리뷰", icon: Eye },
  { href: "/admin/videos", label: "영상 관리", icon: Film },
  { href: "/admin/users", label: "가입자 관리", icon: UserCheck },
  { href: "/admin/stars", label: "STAR 관리", icon: Users },
  { href: "/admin/settlements", label: "정산 관리", icon: DollarSign },
];

const externalItems = [
  { href: "/", label: "영상 브라우저", icon: Play, exact: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const { data: userData } = useQuery({
    queryKey: ["admin-sidebar-user"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { name: string; email: string; avatarUrl?: string | null } };
      return json.data;
    },
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center px-6">
        <Link href="/" className="text-lg font-bold text-sidebar-foreground">
          별들에게 물어봐 <span className="text-xs font-normal text-muted-foreground">관리자</span>
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <Separator className="my-3" />
        {externalItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 space-y-2 relative mt-auto border-t">
        {userData && (
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-sidebar-accent/30 border border-sidebar-border hover:bg-sidebar-accent/50 transition-colors group cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 p-[1px] relative">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {userData.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userData.avatarUrl} alt={userData.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-background shadow-sm">
                ADMIN
              </div>
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{userData.name}</p>
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-sm font-bold">관리자</span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate font-medium">{userData.email}</p>
            </div>
          </Link>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border border-transparent transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
