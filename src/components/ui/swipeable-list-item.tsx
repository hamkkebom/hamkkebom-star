"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimationControls,
  PanInfo,
} from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useHaptic } from "@/hooks/use-haptic";
import { cn } from "@/lib/utils";

interface SwipeAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

const ACTION_WIDTH = 72;

function ActionButtons({
  actions,
  side,
  x,
}: {
  actions: SwipeAction[];
  side: "left" | "right";
  x: ReturnType<typeof useMotionValue<number>>;
}) {
  const totalWidth = actions.length * ACTION_WIDTH;

  const opacity = useTransform(
    x,
    side === "left" ? [0, totalWidth] : [-totalWidth, 0],
    side === "left" ? [0, 1] : [1, 0]
  );

  const scale = useTransform(
    x,
    side === "left" ? [0, totalWidth] : [-totalWidth, 0],
    side === "left" ? [0.8, 1] : [1, 0.8]
  );

  return (
    <motion.div
      className={cn(
        "absolute inset-y-0 flex",
        side === "left" ? "left-0" : "right-0"
      )}
      style={{ opacity, scale }}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          type="button"
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-white",
            action.color
          )}
          style={{ width: ACTION_WIDTH }}
          onClick={action.onClick}
        >
          {action.icon}
          <span className="text-[10px] font-medium">{action.label}</span>
        </button>
      ))}
    </motion.div>
  );
}

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  disabled = false,
}: SwipeableListItemProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const haptic = useHaptic();
  const controls = useAnimationControls();
  const x = useMotionValue(0);
  const crossedRef = React.useRef(false);

  const leftWidth = leftActions.length * ACTION_WIDTH;
  const rightWidth = rightActions.length * ACTION_WIDTH;

  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offsetX = info.offset.x;

    if (offsetX > threshold && leftActions.length > 0) {
      await controls.start({ x: leftWidth, transition: { type: "spring", stiffness: 500, damping: 30 } });
    } else if (offsetX < -threshold && rightActions.length > 0) {
      await controls.start({ x: -rightWidth, transition: { type: "spring", stiffness: 500, damping: 30 } });
    } else {
      await controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
    }
    crossedRef.current = false;
  };

  const handleDrag = () => {
    const currentX = x.get();
    const pastThreshold =
      Math.abs(currentX) >= threshold &&
      ((currentX > 0 && leftActions.length > 0) ||
        (currentX < 0 && rightActions.length > 0));

    if (pastThreshold && !crossedRef.current) {
      crossedRef.current = true;
      haptic.light();
    } else if (!pastThreshold && crossedRef.current) {
      crossedRef.current = false;
    }
  };

  const snapBack = async () => {
    await controls.start({ x: 0, transition: { type: "spring", stiffness: 500, damping: 30 } });
  };

  const handleActionClick = (action: SwipeAction) => {
    action.onClick();
    snapBack();
  };

  if (!isMobile || disabled || (leftActions.length === 0 && rightActions.length === 0)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {leftActions.length > 0 && (
        <ActionButtons
          actions={leftActions.map((a) => ({
            ...a,
            onClick: () => handleActionClick(a),
          }))}
          side="left"
          x={x}
        />
      )}
      {rightActions.length > 0 && (
        <ActionButtons
          actions={rightActions.map((a) => ({
            ...a,
            onClick: () => handleActionClick(a),
          }))}
          side="right"
          x={x}
        />
      )}

      <motion.div
        className="relative z-10 bg-background"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragElastic={0.3}
        dragConstraints={{
          left: rightActions.length > 0 ? -(rightWidth + 20) : 0,
          right: leftActions.length > 0 ? leftWidth + 20 : 0,
        }}
        dragMomentum={false}
        animate={controls}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

export type { SwipeAction, SwipeableListItemProps };
