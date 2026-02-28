"use client";

import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedCard({ children, delay = 0, className }: AnimatedCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm animate-fade-in-up",
        "hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
        className,
      )}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}