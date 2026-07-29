import { useEffect, useState } from "react";
import { getAppPreferences, subscribeAppPreferences } from "@/lib/app-preferences";
import { useVisualViewportHeight } from "@/hooks/use-visual-viewport-height";

const LOCK_CLASS = "app-viewport-lock";

/**
 * Locks html/body overflow while an app shell (chat) is mounted.
 * Prevents iOS document rubber-banding when dragging the composer.
 */
export function useAppViewportLock(enabled = true) {
  const [nativeLock, setNativeLock] = useState(() => getAppPreferences().nativeShellLock);
  const lockActive = enabled && nativeLock;

  useEffect(() => subscribeAppPreferences((p) => setNativeLock(p.nativeShellLock)), []);
  useVisualViewportHeight(lockActive);

  useEffect(() => {
    if (!lockActive || typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    root.classList.add(LOCK_CLASS);
    body.dataset.viewportLock = "1";
    body.style.top = scrollY ? `-${scrollY}px` : "0";

    return () => {
      root.classList.remove(LOCK_CLASS);
      delete body.dataset.viewportLock;
      const top = body.style.top;
      body.style.top = "";
      const restoreY = top ? Math.abs(parseInt(top, 10)) : scrollY;
      window.scrollTo(0, restoreY);
    };
  }, [lockActive]);
}
