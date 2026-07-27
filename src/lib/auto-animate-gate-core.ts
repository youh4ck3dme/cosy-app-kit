/**
 * Pure decision: should AutoAnimate run at all right now?
 * Kept dependency-free so it's testable without React/DOM/formkit.
 */
export function shouldEnableAutoAnimate(params: {
  prefersReducedMotion: boolean;
  speedMode: boolean;
}): boolean {
  return !params.prefersReducedMotion && !params.speedMode;
}
