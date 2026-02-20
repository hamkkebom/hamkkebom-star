"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiTriggerProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiTrigger({ trigger, onComplete }: ConfettiTriggerProps) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#007A8C", "#10B981", "#F59E0B", "#8B5CF6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#007A8C", "#10B981", "#F59E0B", "#8B5CF6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    };

    frame();
  }, [trigger, onComplete]);

  return null;
}
