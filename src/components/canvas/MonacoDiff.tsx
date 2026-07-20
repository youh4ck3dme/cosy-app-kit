"use client";

/**
 * Client-only Monaco DiffEditor.
 * SSR-safe: mount gate + React.lazy — never touch `window` during SSR.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { BUILDER_MONACO_THEME, defineBuilderMonacoTheme, languageFromPath } from "./monaco-theme";

const DiffEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor })),
);

export function MonacoDiff({
  path,
  original,
  modified,
  language,
}: {
  path: string;
  original: string;
  modified: string;
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
      <div className="flex h-[calc(100vh-16rem)] w-full items-center justify-center rounded-2xl border border-border-subtle text-sm text-muted-foreground">
        Loading diff…
      </div>
    );
  }

  const lang = languageFromPath(path, language);

  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-16rem)] items-center justify-center text-sm text-muted-foreground">
          Loading Monaco Diff…
        </div>
      }
    >
      <div className="h-[calc(100vh-16rem)] w-full max-w-6xl overflow-hidden rounded-2xl border border-border-subtle shadow-elevated">
        <DiffEditor
          original={original}
          modified={modified}
          language={lang}
          theme={BUILDER_MONACO_THEME}
          beforeMount={defineBuilderMonacoTheme}
          options={{
            readOnly: true,
            renderSideBySide: wide,
            minimap: { enabled: false },
            fontSize: 12.5,
            fontFamily: "JetBrains Mono Variable, ui-monospace, Menlo, monospace",
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </Suspense>
  );
}
