"use client";

/**
 * Client-only Monaco code editor.
 * SSR-safe: waits for mount before lazy-loading `@monaco-editor/react` (needs `window`).
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { BUILDER_MONACO_THEME, defineBuilderMonacoTheme, languageFromPath } from "./monaco-theme";

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

export function MonacoEditor({
  path,
  value,
  onChange,
  language,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  language?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-2xl border border-border-subtle bg-surface-1/80 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const lang = languageFromPath(path, language);

  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
          Loading Monaco…
        </div>
      }
    >
      <div className="h-[calc(100vh-16rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-border-subtle shadow-elevated">
        <Editor
          // `path` keeps a stable Monaco model per file tab (no remount crash on switch)
          path={path}
          language={lang}
          value={value}
          theme={BUILDER_MONACO_THEME}
          onChange={(v) => onChange(v ?? "")}
          beforeMount={defineBuilderMonacoTheme}
          options={{
            // Minimap off below md
            minimap: { enabled: wide },
            wordWrap: lang === "html" || lang === "markdown" ? "on" : "off",
            fontSize: 13,
            fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
          }}
        />
      </div>
    </Suspense>
  );
}
