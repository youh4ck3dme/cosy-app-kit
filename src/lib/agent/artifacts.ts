export type ArtifactFile = { path: string; language: string; content: string };
export type ParsedArtifact = {
  kind: "html" | "markdown" | "code";
  title: string;
  content: string;
  files: ArtifactFile[];
  entry_path: string | null;
};

// Match fenced blocks with an optional info-string, e.g.
//   ```html
//   ```tsx path=src/App.tsx
//   ```html path=index.html title="Landing"
const FENCE_RE = /```([^\n`]*)\n([\s\S]*?)```/g;

export function parseMeta(info: string): { lang: string; path?: string; title?: string } {
  const parts = info.trim().split(/\s+/);
  const lang = (parts[0] ?? "").toLowerCase();
  const meta: { lang: string; path?: string; title?: string } = { lang };
  for (const p of parts.slice(1)) {
    const m = p.match(/^(path|title)=(?:"([^"]+)"|(\S+))/);
    if (m) {
      const key = m[1] as "path" | "title";
      meta[key] = m[2] ?? m[3];
    }
  }
  return meta;
}

export function inferTitle(content: string, fallback: string): string {
  const t1 = content.match(/<title>([^<]+)<\/title>/i);
  const t2 = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const t3 = content.match(/^#\s+(.+)$/m);
  return (t1?.[1] ?? t2?.[1] ?? t3?.[1] ?? fallback).trim().slice(0, 120);
}

/** Parse assistant markdown into canvas artifacts (fence fallback path). */
export function extractArtifacts(text: string): ParsedArtifact[] {
  const blocks: Array<{ lang: string; path?: string; title?: string; content: string }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FENCE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    const meta = parseMeta(m[1]);
    const content = m[2].trimEnd();
    blocks.push({ ...meta, content });
  }
  if (!blocks.length) return [];

  const artifacts: ParsedArtifact[] = [];
  let buffer: typeof blocks = [];
  const flushMulti = () => {
    if (!buffer.length) return;
    const files: ArtifactFile[] = buffer.map((b) => ({
      path: b.path!,
      language: b.lang || "text",
      content: b.content,
    }));
    const entry =
      files.find((f) => /\.html?$/i.test(f.path)) ??
      files.find((f) => /index\./i.test(f.path)) ??
      files[0];
    const isHtml = /\.html?$/i.test(entry.path);
    artifacts.push({
      kind: isHtml ? "html" : "code",
      title: buffer.find((b) => b.title)?.title ?? inferTitle(entry.content, entry.path),
      content: entry.content,
      files,
      entry_path: entry.path,
    });
    buffer = [];
  };

  for (const b of blocks) {
    if (b.path) {
      buffer.push(b);
      continue;
    }
    flushMulti();
    if (b.lang === "html") {
      artifacts.push({
        kind: "html",
        title: b.title ?? inferTitle(b.content, "Artifact"),
        content: b.content,
        files: [{ path: "index.html", language: "html", content: b.content }],
        entry_path: "index.html",
      });
    } else if (b.lang === "markdown" || b.lang === "md") {
      artifacts.push({
        kind: "markdown",
        title: b.title ?? inferTitle(b.content, "Document"),
        content: b.content,
        files: [{ path: "README.md", language: "markdown", content: b.content }],
        entry_path: "README.md",
      });
    }
  }
  flushMulti();
  return artifacts;
}
