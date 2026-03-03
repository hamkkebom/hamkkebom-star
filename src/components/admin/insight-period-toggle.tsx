"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month";

interface InsightPeriodToggleProps {
    period: Period;
    onChange: (period: Period) => void;
}

export function InsightPeriodToggle({ period, onChange }: InsightPeriodToggleProps) {
    const options = [
        { id: "day", label: "일간" },
        { id: "week", label: "주간" },
        { id: "month", label: "월간" },
    ] as const;

    return (
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-md">
            {options.map((option) => (
                <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={cn(
                        "relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                        period === option.id
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    {period === option.id && (
                        <motion.div
                            layoutId="active-period"
                            className="absolute inset-0 bg-white dark:bg-slate-700 rounded-full shadow-sm"
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                    )}
                    <span className="relative z-10">{option.label}</span>
                </button>
            ))}
        </div>
    );
}
