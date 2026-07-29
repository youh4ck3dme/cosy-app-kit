import { useEffect, useState } from "react";

/** User preference. `cosy` = COSY AI brand skin (AMOLED + Hyper-Blue). */
export type Theme = "light" | "dark" | "cosy" | "system";
/** Applied palette after resolving system. */
export type ResolvedTheme = "light" | "dark" | "cosy";

const STORAGE_KEY = "builder-theme";
const CHANGE_EVENT = "builder-theme-change";
const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: "#0e0f14",
  light: "#fafafa",
  cosy: "#0A0A0C",
};

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "cosy";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "cosy" || raw === "system") return raw;
    // First visit: COSY.AI brand skin is the product default
    return "cosy";
  } catch {
    return "cosy";
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "cosy") return "cosy";
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/** True when the UI should use dark-mode Tailwind variants (.dark). */
export function isDarkResolved(resolved: ResolvedTheme): boolean {
  return resolved === "dark" || resolved === "cosy";
}

/** Flip .dark / .theme-cosy + browser chrome color to match the resolved theme. */
function syncDom(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = isDarkResolved(resolved);
  root.classList.toggle("dark", dark);
  root.classList.toggle("theme-cosy", resolved === "cosy");
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[resolved]);
}

export function setTheme(theme: Theme) {
  try {
    // Always persist, including system (explicit user choice vs first-visit default "cosy")
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode / sandboxed — still apply for this page load.
  }
  syncDom(resolveTheme(theme));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

/**
 * Reactive theme state. Tracks stored preference, OS preference (system mode),
 * and cross-component changes.
 */
export function useTheme(): {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: typeof setTheme;
} {
  const [theme, setThemeState] = useState<Theme>("cosy");
  const [resolved, setResolved] = useState<ResolvedTheme>("cosy");

  useEffect(() => {
    const update = () => {
      const t = getStoredTheme();
      setThemeState(t);
      const r = resolveTheme(t);
      setResolved(r);
      syncDom(r);
    };
    update();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", update);
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return { theme, resolved, setTheme };
}

/**
 * Inline bootstrap for <head>: applies theme class before first paint.
 * Must stay in sync with STORAGE_KEY. Failure defaults to dark (brand).
 * Supports: light | dark | cosy | system.
 */
/** Default first paint = COSY brand (obsidian + dark) when no preference stored. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("builder-theme");var r=document.documentElement;r.classList.remove("theme-cosy");if(!t||t==="cosy"){r.classList.add("dark");r.classList.add("theme-cosy");}else if(t==="system"){var d=matchMedia("(prefers-color-scheme: dark)").matches;r.classList.toggle("dark",d);}else{var dark=t==="dark";r.classList.toggle("dark",dark);if(t==="light")r.classList.remove("dark");}}catch(e){document.documentElement.classList.add("dark");document.documentElement.classList.add("theme-cosy");}})();`;
