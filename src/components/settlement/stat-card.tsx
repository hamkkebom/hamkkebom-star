"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { NumberTicker } from "./number-ticker";
import { AnimatedCard } from "./animated-card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  delay?: number;
  trend?: {
    value: number;
    direction: "up" | "down";
    label?: string;
  };
  iconColor?: string;
  className?: string;
  decimals?: number;
}

export function StatCard({
  title,
  value,
  prefix,
  suffix,
  icon: Icon,
  delay = 0,
  trend,
  iconColor = "text-primary",
  className,
  decimals,
}: StatCardProps) {
  return (
    <AnimatedCard delay={delay} className={className}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-lg bg-primary/8", iconColor.replace("text-", "bg-").replace(/-([\d]+)$/, "-500/10"))}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                trend.direction === "up"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400",
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-1.5">{title}</p>
        <div className="flex items-baseline gap-1">
          <NumberTicker
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
            className="text-2xl font-bold text-foreground"
          />
        </div>
        {trend?.label && (
          <p className="text-xs text-muted-foreground mt-1">{trend.label}</p>
        )}
      </div>
    </AnimatedCard>
  );
}
