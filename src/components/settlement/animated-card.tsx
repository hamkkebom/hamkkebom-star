"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedCard({ children, delay = 0, className }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{
        y: -2,
        transition: { duration: 0.15 },
      }}
      className={cn(
        "rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow duration-200",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
