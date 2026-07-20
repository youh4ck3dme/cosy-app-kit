"use client";

/**
 * Client-only Monaco DiffEditor.
 * SSR-safe: mount gate + React.lazy — never touch `window` during SSR.
 *
 * Unmount: avoid "TextModel got disposed before DiffEditorWidget model got reset"
 * (monaco-editor ≥0.51 + @monaco-editor/react). Keep models on unmount, detach via
 * setModel(null) in a layout effect cleanup that runs with the editor instance.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { DiffOnMount } from "@monaco-editor/react";
import { BUILDER_MONACO_THEME, defineBuilderMonacoTheme, languageFromPath } from "./monaco-theme";

const DiffEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor })),
);

type DiffEditorInstance = Parameters<DiffOnMount>[0];

function safeDetachDiffModels(editor: DiffEditorInstance | null) {
  if (!editor) return;
  try {
    // Detach before models/widget teardown (monaco DiffEditorWidget invariant)
    editor.setModel({
      original: null as unknown as never,
      modified: null as unknown as never,
    });
  } catch {
    /* already disposed */
  }
}

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
  const editorRef = useRef<DiffEditorInstance | null>(null);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // On unmount only: detach models (pair with keepCurrent* so library does not
  // dispose TextModels while DiffEditorWidget still holds them).
  useEffect(() => {
    return () => {
      safeDetachDiffModels(editorRef.current);
      editorRef.current = null;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-16rem)] w-full items-center justify-center rounded-2xl border border-border-subtle text-sm text-muted-foreground">
        Loading diff…
      </div>
    );
  }

  const lang = languageFromPath(path, language);
  // Unique URIs avoid clobbering models when switching files / remounting
  const enc = encodeURIComponent(path.replace(/\\/g, "/"));
  const originalModelPath = `inmemory://builder-diff/${enc}/original`;
  const modifiedModelPath = `inmemory://builder-diff/${enc}/modified`;

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
          key={`diff:${path}:${lang}`}
          original={original}
          modified={modified}
          language={lang}
          originalModelPath={originalModelPath}
          modifiedModelPath={modifiedModelPath}
          // Do not dispose models on unmount — library order disposes models before
          // DiffEditorWidget reset and throws (monaco ≥0.51).
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          theme={BUILDER_MONACO_THEME}
          beforeMount={defineBuilderMonacoTheme}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
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
