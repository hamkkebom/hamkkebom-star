"use client";

import { useRef, useState, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  isEnabled?: boolean;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  pullIndicatorRef: React.RefObject<HTMLDivElement | null>;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  isEnabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const pullIndicatorRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartYRef = useRef(0);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!isEnabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY !== 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const delta = currentY - touchStartYRef.current;

      if (delta > 0) {
        e.preventDefault();
        const distance = Math.min(delta * 0.5, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (isAnimatingRef.current || isRefreshing) return;

      if (pullDistance >= threshold) {
        isAnimatingRef.current = true;
        setIsRefreshing(true);

        try {
          await onRefresh();
        } catch {
          // Error is handled by the caller, just reset state
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          isAnimatingRef.current = false;
        }
      } else if (pullDistance > 0) {
        isAnimatingRef.current = true;
        setPullDistance(0);
        isAnimatingRef.current = false;
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isEnabled, onRefresh, pullDistance, threshold, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    pullIndicatorRef,
  };
}
