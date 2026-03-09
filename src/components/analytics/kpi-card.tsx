"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface KpiCardProps {
    title: string;
    value: number;
    suffix?: string;
    prefix?: string;
    previousValue?: number;
    icon?: React.ReactNode;
    color?: "purple" | "pink" | "green" | "amber" | "red" | "blue";
    format?: "number" | "percent" | "currency";
    decimals?: number;
    delay?: number;
}

const colorMap = {
    purple: { bg: "bg-purple-50 dark:bg-purple-950/30", icon: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    pink: { bg: "bg-pink-50 dark:bg-pink-950/30", icon: "text-pink-600 dark:text-pink-400", border: "border-pink-200 dark:border-pink-800" },
    green: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
    red: { bg: "bg-red-50 dark:bg-red-950/30", icon: "text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/30", icon: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
};

function useCountUp(target: number, duration = 800, decimals = 0) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Number((eased * target).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration, decimals]);

    return count;
}

export function KpiCard({
    title,
    value,
    suffix = "",
    prefix = "",
    previousValue,
    icon,
    color = "purple",
    format = "number",
    decimals = 0,
    delay = 0,
}: KpiCardProps) {
    const animatedValue = useCountUp(value, 800, decimals);
    const colors = colorMap[color];

    const trend = previousValue !== undefined
        ? value > previousValue ? "up" : value < previousValue ? "down" : "flat"
        : undefined;

    const trendPercent = previousValue && previousValue !== 0
        ? (((value - previousValue) / previousValue) * 100).toFixed(1)
        : null;

    const formatValue = (v: number) => {
        if (format === "currency") return `${prefix}${v.toLocaleString()}${suffix || "원"}`;
        if (format === "percent") return `${prefix}${v}${suffix || "%"}`;
        return `${prefix}${v.toLocaleString()}${suffix}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "rounded-2xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg",
                colors.bg, colors.border
            )}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{title}</span>
                {icon && <div className={cn("p-2 rounded-xl", colors.bg, colors.icon)}>{icon}</div>}
            </div>

            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold tracking-tight">{formatValue(animatedValue)}</span>

                {trend && trendPercent && (
                    <span className={cn(
                        "flex items-center gap-0.5 text-xs font-medium pb-0.5",
                        trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
                    )}>
                        {trend === "up" && <TrendingUp className="w-3 h-3" />}
                        {trend === "down" && <TrendingDown className="w-3 h-3" />}
                        {trend === "flat" && <Minus className="w-3 h-3" />}
                        {trend === "up" ? "+" : ""}{trendPercent}%
                    </span>
                )}
            </div>
        </motion.div>
    );
}
