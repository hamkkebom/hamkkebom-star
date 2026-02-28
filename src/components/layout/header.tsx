"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { NotificationBadge } from "@/components/layout/notification-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./admin-sidebar";
import { Sidebar } from "./sidebar";

export function Header({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigation changes should close the mobile sidebar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-4 md:px-6 backdrop-blur-sm z-30 relative">
      <div className="flex items-center md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2 mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="p-0 w-64 border-r-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            {isAdmin ? <AdminSidebar /> : <Sidebar />}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <ThemeToggle />
        <NotificationBadge />
      </div>
    </header>
  );
}
