import { useEffect } from "react";

export type ShortcutHandlers = {
  onCommandPalette?: () => void;
  onNewChat?: () => void;
  onFocusComposer?: () => void;
  onToggleView?: () => void;
  onPrevThread?: () => void;
  onNextThread?: () => void;
  onShowShortcuts?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Single global keydown listener for app-wide shortcuts:
 *   Cmd/Ctrl+K  command palette      Cmd/Ctrl+Shift+O  new chat
 *   Cmd/Ctrl+/  focus composer      Cmd/Ctrl+.        toggle chat/preview
 *   [ / ]       prev/next thread    ?                 shortcut cheatsheet
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handlers.onNewChat?.();
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        handlers.onFocusComposer?.();
        return;
      }
      if (mod && e.key === ".") {
        e.preventDefault();
        handlers.onToggleView?.();
        return;
      }

      // Plain-key shortcuts never fire while typing.
      if (isTypingTarget(e.target) || mod || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        handlers.onShowShortcuts?.();
      } else if (e.key === "[") {
        e.preventDefault();
        handlers.onPrevThread?.();
      } else if (e.key === "]") {
        e.preventDefault();
        handlers.onNextThread?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Handlers object is re-created each render; listeners are cheap to rebind.
  }, [handlers]);
}
