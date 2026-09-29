"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ease } from "@/lib/motion";

interface AnimatedNumberProps {
  value: number;
  /** Start value on mount; defaults to `value` (no count-up). */
  from?: number;
  delay?: number;
  duration?: number;
  className?: string;
}

/** A number that rolls to its new value instead of jumping. */
export function AnimatedNumber({ value, from, delay = 0, duration = 0.6, className }: AnimatedNumberProps) {
  const mv = useMotionValue(from ?? value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    const controls = animate(mv, value, { duration, delay, ease: ease.out });
    return () => controls.stop();
  }, [mv, value, delay, duration]);
  return <motion.span className={`tabular-nums ${className ?? ""}`}>{text}</motion.span>;
}
