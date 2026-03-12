"use client";

import { useRef } from "react";

interface UseDoubleTapOptions {
  onDoubleTap: (event: TouchEvent | MouseEvent) => void;
  delay?: number;
}

interface UseDoubleTapHandlers {
  onTouchEnd: (e: React.TouchEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const DISTANCE_THRESHOLD = 30; // pixels

export function useDoubleTap({
  onDoubleTap,
  delay = 300,
}: UseDoubleTapOptions): UseDoubleTapHandlers {
  const lastTapRef = useRef<{
    timestamp: number;
    x: number;
    y: number;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = (event: TouchEvent | MouseEvent) => {
    const now = Date.now();
    const x = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const y = "touches" in event ? event.touches[0]?.clientY ?? 0 : event.clientY;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (lastTapRef.current) {
      const timeDiff = now - lastTapRef.current.timestamp;
      const distX = Math.abs(x - lastTapRef.current.x);
      const distY = Math.abs(y - lastTapRef.current.y);
      const distance = Math.sqrt(distX * distX + distY * distY);

      if (timeDiff <= delay && distance <= DISTANCE_THRESHOLD) {
        // Double-tap detected
        event.preventDefault();
        onDoubleTap(event);
        lastTapRef.current = null;
        return;
      }
    }

    // Single tap — set timer to reset
    lastTapRef.current = { timestamp: now, x, y };
    timerRef.current = setTimeout(() => {
      lastTapRef.current = null;
      timerRef.current = null;
    }, delay);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    handleTap(e.nativeEvent || (e as unknown as TouchEvent));
  };

  const onClick = (e: React.MouseEvent) => {
    handleTap(e.nativeEvent || (e as unknown as MouseEvent));
  };

  return { onTouchEnd, onClick };
}
