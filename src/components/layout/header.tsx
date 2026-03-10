"use client";

import { usePathname } from "next/navigation";
import { NotificationBadge } from "@/components/layout/notification-badge";
import { Button } from "@/components/ui/button";

export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 md:px-6 backdrop-blur-sm z-30 relative">
      <div className="flex items-center gap-1 ml-auto">
        <NotificationBadge />
      </div>
    </header>
  );
}
