import { useEffect, useRef } from "react";

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
  // The chat page re-renders on every streamed chunk; keep the window listener
  // stable and read the latest handlers through a ref instead of re-binding.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlersRef.current.onCommandPalette?.();
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handlersRef.current.onNewChat?.();
        return;
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        handlersRef.current.onFocusComposer?.();
        return;
      }
      if (mod && e.key === ".") {
        e.preventDefault();
        handlersRef.current.onToggleView?.();
        return;
      }

      // Plain-key shortcuts never fire while typing.
      if (isTypingTarget(e.target) || mod || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        handlersRef.current.onShowShortcuts?.();
      } else if (e.key === "[") {
        e.preventDefault();
        handlersRef.current.onPrevThread?.();
      } else if (e.key === "]") {
        e.preventDefault();
        handlersRef.current.onNextThread?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
