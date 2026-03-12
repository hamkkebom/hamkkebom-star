"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SwipeHintProps {
  storageKey: string;
  direction?: "left" | "right" | "both";
  message?: string;
}

export function SwipeHint({
  storageKey,
  direction = "left",
  message = "밀어서 액션",
}: SwipeHintProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const key = `swipe-hint-${storageKey}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setShow(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time init from localStorage
      const timer = setTimeout(() => {
        setShow(false);
        localStorage.setItem(key, "1");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, storageKey]);

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
        >
          {(direction === "right" || direction === "both") && (
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          )}
          <span>{message}</span>
          {(direction === "left" || direction === "both") && (
            <motion.div
              animate={{ x: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
