"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox } from "lucide-react";

interface ChartContainerProps {
    title: string;
    description?: string;
    isLoading?: boolean;
    error?: string | null;
    isEmpty?: boolean;
    emptyMessage?: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

function Skeleton() {
    return (
        <div className="space-y-3 animate-pulse p-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-[200px] bg-muted/50 rounded-xl" />
        </div>
    );
}

export function ChartContainer({
    title,
    description,
    isLoading,
    error,
    isEmpty,
    emptyMessage = "데이터가 없습니다",
    children,
    className,
    action,
}: ChartContainerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                "rounded-2xl border bg-card p-5 shadow-sm",
                className
            )}
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                {action}
            </div>

            {isLoading ? (
                <Skeleton />
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-2">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-sm">{error}</p>
                </div>
            ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Inbox className="w-8 h-8" />
                    <p className="text-sm">{emptyMessage}</p>
                </div>
            ) : (
                children
            )}
        </motion.div>
    );
}
