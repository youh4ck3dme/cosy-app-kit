import { useCallback } from "react";

export function useHaptic() {
  const trigger = useCallback((pattern: number | number[]) => {
    // Check if Vibration API is supported
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch (e) {
        console.warn("Vibration API failed", e);
      }
    }
  }, []);

  const triggerClick = useCallback(() => {
    // Short tick for standard interactions (e.g. 10ms)
    trigger(10);
  }, [trigger]);

  const triggerSuccess = useCallback(() => {
    // Longer tick for confirmations (e.g. 50ms)
    trigger(50);
  }, [trigger]);

  const triggerError = useCallback(() => {
    // Double pulse for errors (e.g. 50ms on, 50ms off, 50ms on)
    trigger([50, 50, 50]);
  }, [trigger]);

  const triggerHeavy = useCallback(() => {
    // Heavy feedback
    trigger(100);
  }, [trigger]);

  return {
    triggerClick,
    triggerSuccess,
    triggerError,
    triggerHeavy,
    triggerRaw: trigger,
  };
}
