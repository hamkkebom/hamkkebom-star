"use client";

import { useState, useEffect, useRef } from "react";

export interface ScrollDirectionState {
  scrollDirection: "up" | "down" | null;
  isAtTop: boolean;
}

export interface UseScrollDirectionOptions {
  threshold?: number;
}

export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): ScrollDirectionState {
  const { threshold = 10 } = options;
  const [state, setState] = useState<ScrollDirectionState>({
    scrollDirection: null,
    isAtTop: true,
  });
  const lastScrollYRef = useRef<number>(0);

  useEffect(() => {
    // Initialize lastScrollY with current scroll position
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollYRef.current;
      const isAtTop = currentScrollY <= 0;

      // Only update direction if delta exceeds threshold
      if (Math.abs(delta) >= threshold) {
        const newDirection = delta > 0 ? "down" : "up";
        setState({
          scrollDirection: newDirection,
          isAtTop,
        });
        lastScrollYRef.current = currentScrollY;
      } else {
        // Update isAtTop even if direction doesn't change
        setState((prev) => ({
          ...prev,
          isAtTop,
        }));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return state;
}
