"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
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
  const prevValueRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const hasBeenVisible = useRef(false);

  const formatNumber = useCallback(
    (num: number) => {
      const formatted = new Intl.NumberFormat("ko-KR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(Math.round(num));
      return `${prefix}${formatted}${suffix}`;
    },
    [prefix, suffix, decimals],
  );

  const animateToValue = useCallback(
    (from: number, to: number) => {
      if (!ref.current) return;

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (from === to) {
        ref.current.textContent = formatNumber(to);
        return;
      }

      const startTime = performance.now();
      const durationMs = duration * 1000;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const easedProgress = easeOutCubic(progress);
        const current = from + (to - from) * easedProgress;

        if (ref.current) {
          ref.current.textContent = formatNumber(current);
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          prevValueRef.current = to;
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    [duration, formatNumber],
  );

  // IntersectionObserver: 최초 화면 진입 시 애니메이션
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible.current) {
          hasBeenVisible.current = true;
          animateToValue(0, value);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -50px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [animateToValue, value]);

  // value 변경 감지: 이미 보인 적 있으면 바로 재애니메이션
  useEffect(() => {
    if (!hasBeenVisible.current) return;
    if (prevValueRef.current === value) return;

    animateToValue(prevValueRef.current, value);
  }, [value, animateToValue]);

  // cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {formatNumber(0)}
    </span>
  );
}