// Motion tokens. See docs/DESIGN.md, "Motion system".
import type { Transition } from "motion/react";

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const dur = {
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
  cinematic: 1.2,
};

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 36 } satisfies Transition,
  smooth: { type: "spring", stiffness: 180, damping: 26 } satisfies Transition,
  panel: { type: "spring", stiffness: 280, damping: 32 } satisfies Transition,
};

export const stagger = {
  list: 0.025,
  hero: 0.06,
};

/** A fade-and-rise used for staggered children. */
export const riseIn = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: dur.base + 0.08, ease: ease.out } },
};
