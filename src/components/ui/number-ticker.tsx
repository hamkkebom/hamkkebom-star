"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export default function NumberTicker({
    value,
    direction = "up",
    delay = 0,
    className,
    formatOptions = { maximumFractionDigits: 1 },
}: {
    value: number;
    direction?: "up" | "down";
    className?: string;
    delay?: number; // delay in s
    formatOptions?: Intl.NumberFormatOptions;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 30,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            setTimeout(() => {
                motionValue.set(direction === "down" ? 0 : value);
            }, delay * 1000);
        }
    }, [motionValue, isInView, delay, value, direction]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = Intl.NumberFormat("ko-KR", formatOptions).format(Number(latest));
            }
        });
    }, [springValue, formatOptions]);

    return (
        <span
            className={cn("inline-block tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tighter", className)}
            ref={ref}
        >
            0
        </span>
    );
}
