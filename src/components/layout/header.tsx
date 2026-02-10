"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBadge } from "@/components/layout/notification-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuthStore } from "@/stores/auth-store";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <header className="flex h-14 items-center justify-end border-b bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBadge />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-48">
             {user?.role === "STAR" && (
               <>
                 <DropdownMenuItem onClick={() => router.push("/stars/profile")}>
                   <User className="mr-2 h-4 w-4" />
                   프로필
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push("/stars/settings")}>
                   <Settings className="mr-2 h-4 w-4" />
                   설정
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
               </>
             )}
             <DropdownMenuItem onClick={handleSignOut}>
               <LogOut className="mr-2 h-4 w-4" />
               로그아웃
             </DropdownMenuItem>
           </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
