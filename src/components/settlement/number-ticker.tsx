"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

export function NumberTicker({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
  className,
  decimals = 0,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });

  useEffect(() => {
    if (isInView) {
      const animation = animate(motionValue, value, {
        duration,
        ease: [0.25, 0.1, 0.25, 1],
        onUpdate: (latest) => {
          if (ref.current) {
            const formatted = new Intl.NumberFormat("ko-KR", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            }).format(Math.round(latest));
            ref.current.textContent = `${prefix}${formatted}${suffix}`;
          }
        },
      });
      return () => animation.stop();
    }
  }, [isInView, value, duration, motionValue, prefix, suffix, decimals]);

  return (
    <span
      ref={ref}
      className={cn("tabular-nums", className)}
    >
      {prefix}0{suffix}
    </span>
  );
}
