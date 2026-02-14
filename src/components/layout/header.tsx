"use client";

import { NotificationBadge } from "@/components/layout/notification-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {

  return (
    <header className="flex h-14 items-center justify-end border-b bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBadge />
      </div>
    </header>
  );
}
