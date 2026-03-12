"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import NumberTicker from "@/components/ui/number-ticker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function InsightKpiCard({
    title,
    value,
    trend,
    icon: Icon,
    prefix = "",
    suffix = "",
    description,
    isCurrency = false,
    delay = 0
}: {
    title: string;
    value: number;
    trend: number;
    icon: React.ElementType;
    prefix?: string;
    suffix?: string;
    description?: string;
    isCurrency?: boolean;
    delay?: number;
}) {
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const isNeutral = trend === 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
            className="relative group overflow-hidden rounded-xl bg-card dark:bg-card border border-border flex flex-col p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20"
        >
            {/* Background Glow */}
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500" />

            <div className="relative flex items-center justify-between z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 drop-shadow-sm" />
                </div>

                <div className={cn(
                    "flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full transition-colors",
                    isPositive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        isNegative ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                )}>
                    {isPositive && <TrendingUp className="w-3 h-3" />}
                    {isNegative && <TrendingDown className="w-3 h-3" />}
                    {isNeutral && <Minus className="w-3 h-3" />}
                    {Math.abs(trend)}%
                </div>
            </div>

            <div className="relative mt-5 z-10 flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
                    {description && (
                        <TooltipProvider>
                            <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                    <div className="cursor-help p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-center bg-slate-800 text-foreground dark:bg-slate-100 dark:text-slate-900 border-none shadow-xl">
                                    <p>{description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <div className="flex items-baseline gap-1 font-black text-3xl xl:text-4xl tracking-tighter">
                    {prefix && <span className="text-xl xl:text-2xl text-slate-400 dark:text-slate-500">{prefix}</span>}
                    <NumberTicker
                        value={value}
                        formatOptions={{
                            maximumFractionDigits: isCurrency ? 0 : 1,
                            notation: isCurrency && value >= 10000 ? "compact" : "standard"
                        }}
                    />
                    {suffix && <span className="text-lg xl:text-xl text-slate-400 dark:text-slate-500 ml-0.5">{suffix}</span>}
                </div>
            </div>

            <div className="absolute inset-0 border border-border dark:border-border/50 rounded-xl pointer-events-none" />
        </motion.div>
    );
}
