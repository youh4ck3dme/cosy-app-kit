import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "builder-theme";
const CHANGE_EVENT = "builder-theme-change";
const THEME_COLOR: Record<ResolvedTheme, string> = { dark: "#0e0f14", light: "#fafafa" };

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "light" || raw === "dark" ? raw : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/** Flip the .dark class + browser chrome color to match the resolved theme. */
function syncDom(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[resolved]);
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
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
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

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
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem("builder-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){document.documentElement.classList.add("dark");}})();`;
