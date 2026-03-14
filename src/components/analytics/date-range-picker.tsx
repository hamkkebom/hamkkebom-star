"use client";

import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export type DatePreset = "7d" | "30d" | "90d" | "year" | "all";

interface DateRangePickerProps {
    value: DatePreset;
    onChange: (preset: DatePreset) => void;
    className?: string;
}

const presets: { value: DatePreset; label: string }[] = [
    { value: "7d", label: "7일" },
    { value: "30d", label: "30일" },
    { value: "90d", label: "90일" },
    { value: "year", label: "올해" },
    { value: "all", label: "전체" },
];

export function getDateRange(preset: DatePreset): { from: string; to: string; label: string } {
    const now = new Date();
    const to = now.toISOString();

    switch (preset) {
        case "7d":
            return { from: new Date(now.getTime() - 7 * 86400000).toISOString(), to, label: "최근 7일" };
        case "30d":
            return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to, label: "최근 30일" };
        case "90d":
            return { from: new Date(now.getTime() - 90 * 86400000).toISOString(), to, label: "최근 90일" };
        case "year":
            return { from: new Date(now.getFullYear(), 0, 1).toISOString(), to, label: `${now.getFullYear()}년` };
        case "all":
            return { from: new Date(2020, 0, 1).toISOString(), to, label: "전체" };
        default:
            return { from: new Date(now.getTime() - 30 * 86400000).toISOString(), to, label: "최근 30일" };
    }
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <div className="flex rounded-xl bg-muted/50 p-1 gap-0.5">
                {presets.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => onChange(p.value)}
                        className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                            value === p.value
                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
