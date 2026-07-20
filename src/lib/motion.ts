import { useReducedMotion } from "motion/react";
import type { Transition, Variants } from "motion/react";

/** Shared spring for interactive UI (pane switches, pills, device frames). */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

/** Softer spring for larger surfaces (panels, sheets). */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: springTransition },
};

export const scalePop: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } },
};

/**
 * Like motion's useReducedMotion but never null: true only when the user
 * explicitly prefers reduced motion.
 */
export function useReducedMotionSafe(): boolean {
  return useReducedMotion() === true;
}
