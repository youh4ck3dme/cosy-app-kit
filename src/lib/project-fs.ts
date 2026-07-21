/**
 * Virtual project filesystem helpers (shared — safe for unit tests).
 */
import { MAX_FILE_BYTES } from "@/lib/agent/patch";

export const MAX_PROJECT_FILES = 64;
export const MAX_TOTAL_PROJECT_BYTES = MAX_FILE_BYTES * 8;

export type ProjectFsFile = { path: string; content: string; language?: string };

export type NormalizePathResult =
  | { ok: true; path: string }
  | { ok: false; reason: "empty" | "traversal" | "absolute" | "null_byte" | "invalid" };

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const ALLOWED_EXT = new Set(Object.keys(MIME_BY_EXT));

export function normalizeProjectPath(raw: string): NormalizePathResult {
  if (raw == null || typeof raw !== "string") return { ok: false, reason: "invalid" };
  if (raw.includes("\0")) return { ok: false, reason: "null_byte" };
  let p = raw.trim().replace(/\\/g, "/");
  if (!p || p === "/") return { ok: false, reason: "empty" };
  if (/^[a-zA-Z]:/.test(p) || p.startsWith("/")) return { ok: false, reason: "absolute" };
  while (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/") || p.includes("://")) return { ok: false, reason: "absolute" };
  const parts = p.split("/").filter((seg) => seg.length > 0 && seg !== ".");
  if (parts.some((seg) => seg === "..")) return { ok: false, reason: "traversal" };
  if (!parts.length) return { ok: false, reason: "empty" };
  return { ok: true, path: parts.join("/") };
}

export function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  const i = base.lastIndexOf(".");
  if (i < 0) return "";
  return base.slice(i).toLowerCase();
}

export function mimeForPath(path: string): string | null {
  const ext = extensionOf(path);
  if (!ext || !ALLOWED_EXT.has(ext)) return null;
  return MIME_BY_EXT[ext] ?? null;
}

export function basenamePath(path: string): string {
  const p = path.replace(/\\/g, "/");
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

export function artifactToFiles(artifact: {
  kind?: string | null;
  content?: string | null;
  entry_path?: string | null;
  files?: unknown;
}): ProjectFsFile[] {
  const raw = artifact.files;
  if (Array.isArray(raw) && raw.length > 0) {
    const out: ProjectFsFile[] = [];
    for (const f of raw) {
      if (!f || typeof f !== "object") continue;
      const row = f as Record<string, unknown>;
      const path = typeof row.path === "string" ? row.path : "";
      const content = typeof row.content === "string" ? row.content : "";
      const language = typeof row.language === "string" ? row.language : undefined;
      if (!path) continue;
      out.push({ path, content, language });
    }
    return out;
  }
  const entry =
    (typeof artifact.entry_path === "string" && artifact.entry_path) ||
    (artifact.kind === "markdown" ? "README.md" : "index.html");
  return [
    {
      path: entry,
      content: typeof artifact.content === "string" ? artifact.content : "",
      language: artifact.kind ?? "html",
    },
  ];
}

export type ResolveFileResult =
  | { ok: true; path: string; content: string; mime: string }
  | { ok: false; status: 400 | 404 | 413 | 415; reason: string };

export function resolveArtifactFile(
  files: ProjectFsFile[],
  requestPath: string,
): ResolveFileResult {
  const norm = normalizeProjectPath(requestPath);
  if (!norm.ok) {
    return { ok: false, status: 400, reason: `invalid_path:${norm.reason}` };
  }
  if (files.length > MAX_PROJECT_FILES) {
    return { ok: false, status: 413, reason: "too_many_files" };
  }
  let total = 0;
  for (const f of files) total += f.content?.length ?? 0;
  if (total > MAX_TOTAL_PROJECT_BYTES) {
    return { ok: false, status: 413, reason: "package_too_large" };
  }

  const mime = mimeForPath(norm.path);
  if (!mime) {
    return { ok: false, status: 415, reason: "mime_not_allowed" };
  }

  const byPath = new Map<string, ProjectFsFile>();
  const byBase = new Map<string, ProjectFsFile>();
  for (const f of files) {
    const n = normalizeProjectPath(f.path);
    if (!n.ok) continue;
    byPath.set(n.path, { ...f, path: n.path });
    byBase.set(basenamePath(n.path).toLowerCase(), { ...f, path: n.path });
  }

  const hit =
    byPath.get(norm.path) ?? byBase.get(basenamePath(norm.path).toLowerCase()) ?? null;
  if (!hit) {
    return { ok: false, status: 404, reason: "not_found" };
  }
  if ((hit.content?.length ?? 0) > MAX_FILE_BYTES) {
    return { ok: false, status: 413, reason: "file_too_large" };
  }
  return { ok: true, path: hit.path, content: hit.content ?? "", mime };
}

export function needsUrlPreview(files: ProjectFsFile[]): boolean {
  if (files.length >= 3) return true;
  const html = files.filter((f) => /\.html?$/i.test(f.path));
  if (html.length >= 2) return true;
  for (const f of html) {
    if (/(?:href|src)\s*=\s*["'][^"']+\.(?:css|js|mjs)["']/i.test(f.content)) return true;
  }
  return files.some((f) => /\.(css|js|mjs)$/i.test(f.path)) && html.length >= 1;
}

export function buildPreviewCsp(opts: { networkDisabled?: boolean }): string {
  const connect = opts.networkDisabled ? "'none'" : "'self'";
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connect}`,
    "worker-src 'none'",
    "object-src 'none'",
    "media-src 'none'",
  ].join("; ");
}

export function isHtmlMime(mime: string): boolean {
  return mime.startsWith("text/html");
}

export function findDuplicatePaths(files: ProjectFsFile[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const f of files) {
    const n = normalizeProjectPath(f.path);
    if (!n.ok) continue;
    if (seen.has(n.path)) dups.push(n.path);
    else seen.add(n.path);
  }
  return dups;
}
