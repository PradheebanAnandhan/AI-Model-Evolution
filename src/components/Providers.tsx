"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Motion respects the OS reduced-motion setting everywhere (transforms become instant). */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
