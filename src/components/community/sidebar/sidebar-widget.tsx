import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarWidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  moreLink?: string;
  moreLabel?: string;
  className?: string;
}

export function SidebarWidget({ 
  title, 
  icon, 
  children, 
  moreLink, 
  moreLabel = "더보기",
  className
}: SidebarWidgetProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]", className)}>
      <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/20">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          {icon}
          {title}
        </h3>
        {moreLink && (
          <Link href={moreLink} className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5">
            {moreLabel}
            <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
