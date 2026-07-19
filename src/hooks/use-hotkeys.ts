import { useCallback, useEffect } from "react";

type HotkeyHandler = (e: KeyboardEvent) => void;

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return t.isContentEditable;
}

/**
 * Register a global hotkey. Use `allowInInput` when the shortcut should fire
 * even while typing (e.g. Cmd+Enter to send).
 */
export function useHotkey(
  combo: string,
  handler: HotkeyHandler,
  opts?: { allowInInput?: boolean; enabled?: boolean },
) {
  const allowInInput = opts?.allowInInput ?? false;
  const enabled = opts?.enabled ?? true;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (!allowInInput && isEditableTarget(e.target)) return;

      const parts = combo.toLowerCase().split("+");
      const key = parts[parts.length - 1];
      const needMeta = parts.includes("meta") || parts.includes("cmd") || parts.includes("mod");
      const needCtrl = parts.includes("ctrl");
      const needShift = parts.includes("shift");
      const needAlt = parts.includes("alt");

      const modPressed = e.metaKey || e.ctrlKey;
      if (needMeta && !modPressed) return;
      if (needCtrl && !e.ctrlKey) return;
      if (needShift && !e.shiftKey) return;
      if (needAlt && !e.altKey) return;
      // When combo asks for mod, don't require BOTH meta and ctrl.
      if (!needMeta && !needCtrl && (e.metaKey || e.ctrlKey)) return;

      const pressed = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
      if (pressed !== key && e.code.toLowerCase() !== `key${key}`) {
        // Allow "/" and "?" etc.
        if (pressed !== key) return;
      }

      handler(e);
    },
    [combo, handler, allowInInput, enabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);
}
