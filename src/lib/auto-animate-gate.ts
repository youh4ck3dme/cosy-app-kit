import { useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import { useAppPreferences } from "@/hooks/use-app-preferences";
import { useReducedMotionSafe } from "./motion";
import { shouldEnableAutoAnimate } from "./auto-animate-gate-core";

export { shouldEnableAutoAnimate } from "./auto-animate-gate-core";

/**
 * `useAutoAnimate`, gated by the same two signals every other motion in the
 * shell already respects: `prefers-reduced-motion` and the user's Speed mode
 * preference. Apply the returned ref to the *immediate parent* of the list
 * items you want to diff-animate (add/remove/reorder) — nested lists need
 * their own call.
 */
export function useGatedAutoAnimate<T extends Element>() {
  const [ref, enable] = useAutoAnimate<T>();
  const prefersReducedMotion = useReducedMotionSafe();
  const { prefs } = useAppPreferences();

  useEffect(() => {
    enable(shouldEnableAutoAnimate({ prefersReducedMotion, speedMode: prefs.speedMode }));
  }, [prefersReducedMotion, prefs.speedMode, enable]);

  return ref;
}
