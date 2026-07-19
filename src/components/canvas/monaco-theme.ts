/** Monaco theme mapped from Builder OKLCH dark surfaces. */

export const BUILDER_MONACO_THEME = "builder-dark";

export function defineBuilderMonacoTheme(monaco: {
  editor: {
    defineTheme: (
      name: string,
      theme: {
        base: "vs" | "vs-dark" | "hc-black";
        inherit: boolean;
        rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
        colors: Record<string, string>;
      },
    ) => void;
  };
}) {
  monaco.editor.defineTheme(BUILDER_MONACO_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b728a", fontStyle: "italic" },
      { token: "string", foreground: "7dd3c0" },
      { token: "keyword", foreground: "a5b4fc" },
      { token: "number", foreground: "f0abfc" },
    ],
    colors: {
      "editor.background": "#14161f",
      "editor.foreground": "#f4f4f8",
      "editorLineNumber.foreground": "#5c6370",
      "editor.selectionBackground": "#3b3f5c88",
      "editor.lineHighlightBackground": "#1c2030",
      "editorCursor.foreground": "#c4b5fd",
      "editorWidget.background": "#1a1d28",
      "diffEditor.insertedTextBackground": "#14532d44",
      "diffEditor.removedTextBackground": "#7f1d1d44",
    },
  });
}

export function languageFromPath(path: string, fallback = "plaintext"): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "html",
    htm: "html",
    css: "css",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    markdown: "markdown",
    py: "python",
  };
  return map[ext] ?? fallback;
}
