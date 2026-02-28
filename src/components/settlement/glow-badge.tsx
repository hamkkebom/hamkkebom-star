"use client";

import { cn } from "@/lib/utils";

type GlowVariant = "approved" | "pending" | "completed" | "failed" | "processing";

interface GlowBadgeProps {
  label: string;
  variant: GlowVariant;
  glow?: boolean;
  className?: string;
  size?: "sm" | "md";
}

const variantConfig: Record<GlowVariant, {
  bg: string;
  text: string;
  border: string;
  glowClass: string;
  dot: string;
}> = {
  approved: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500/30",
    glowClass: "shadow-[0_0_12px_rgba(6,182,212,0.4)]",
    dot: "bg-cyan-500",
  },
  pending: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    glowClass: "shadow-[0_0_10px_rgba(245,158,11,0.3)]",
    dot: "bg-amber-500",
  },
  completed: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    glowClass: "shadow-[0_0_10px_rgba(16,185,129,0.35)]",
    dot: "bg-emerald-500",
  },
  failed: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500/30",
    glowClass: "shadow-[0_0_10px_rgba(239,68,68,0.3)]",
    dot: "bg-red-500",
  },
  processing: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    glowClass: "shadow-[0_0_10px_rgba(139,92,246,0.3)]",
    dot: "bg-violet-500",
  },
};

export function GlowBadge({ label, variant, glow = true, className, size = "sm" }: GlowBadgeProps) {
  const config = variantConfig[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-300 animate-scale-in",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.bg,
        config.text,
        config.border,
        glow && config.glowClass,
        className,
      )}
    >
      <span
        className={cn(
          "rounded-full animate-[badgePulse_2s_ease-in-out_infinite]",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          config.dot,
        )}
      />
      {label}
    </span>
  );
}