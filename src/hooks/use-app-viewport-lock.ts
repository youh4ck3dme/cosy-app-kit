import { useEffect } from "react";

const LOCK_CLASS = "app-viewport-lock";

/**
 * Locks html/body overflow while an app shell (chat) is mounted.
 * Prevents iOS document rubber-banding when dragging the composer.
 */
export function useAppViewportLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add(LOCK_CLASS);
    return () => {
      root.classList.remove(LOCK_CLASS);
    };
  }, [enabled]);
}
