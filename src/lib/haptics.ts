import { getAppPreferences } from "@/lib/app-preferences";

/**
 * Tiny tactile feedback for key actions on devices that support it.
 * No-ops on desktop/SSR and when the user prefers reduced motion.
 */
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (!getAppPreferences().hapticsEnabled) return;
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw without a user gesture — feedback is best-effort.
  }
}
