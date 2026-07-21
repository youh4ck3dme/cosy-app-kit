import { useEffect } from "react";

/**
 * Keeps `--app-height` in sync with visualViewport so fixed shells do not
 * bounce when iOS Safari shows/hides the URL bar or keyboard.
 */
export function useVisualViewportHeight(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${Math.round(h)}px`);
      const offsetTop = window.visualViewport?.offsetTop ?? 0;
      root.style.setProperty("--app-offset-top", `${Math.round(offsetTop)}px`);
    };

    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--app-offset-top");
    };
  }, [enabled]);
}
