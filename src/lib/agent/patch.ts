/** Pure file patch helpers (unit-testable, no Supabase). */

export const MAX_FILE_BYTES = 500_000;
export const SNIPPET_CHARS = 2_000;

export type ApplySearchReplaceInput = {
  content: string;
  search: string;
  replace?: string;
  replace_all?: boolean;
};

export type ApplySearchReplaceResult =
  | { ok: true; content: string; replacements: number; beforeSnippet: string; afterSnippet: string }
  | { ok: false; error: string };

export function snippet(text: string, max = SNIPPET_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function applySearchReplace(input: ApplySearchReplaceInput): ApplySearchReplaceResult {
  const { content, search, replace = "", replace_all = false } = input;
  if (!search) return { ok: false, error: "search is required for search_replace mode" };
  if (!content.includes(search)) {
    return { ok: false, error: "search string not found in file" };
  }
  let next: string;
  let replacements: number;
  if (replace_all) {
    const parts = content.split(search);
    replacements = parts.length - 1;
    next = parts.join(replace);
  } else {
    replacements = 1;
    next = content.replace(search, replace);
  }
  if (next.length > MAX_FILE_BYTES) {
    return { ok: false, error: `result exceeds ${MAX_FILE_BYTES} bytes` };
  }
  return {
    ok: true,
    content: next,
    replacements,
    beforeSnippet: snippet(content),
    afterSnippet: snippet(next),
  };
}

export function applyRewrite(
  content: string,
): { ok: true; content: string; beforeSnippet: string; afterSnippet: string } | { ok: false; error: string } {
  if (content.length > MAX_FILE_BYTES) {
    return { ok: false, error: `content exceeds ${MAX_FILE_BYTES} bytes` };
  }
  return {
    ok: true,
    content,
    beforeSnippet: snippet(""),
    afterSnippet: snippet(content),
  };
}

/**
 * Normalize a relative artifact path. Rejects absolute paths and `..` segments.
 */
export function sanitizeRelativePath(raw: string): { ok: true; path: string } | { ok: false; error: string } {
  const trimmed = raw.trim().replace(/\\/g, "/");
  if (!trimmed) return { ok: false, error: "path is empty" };
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) {
    return { ok: false, error: "absolute paths are not allowed" };
  }
  const parts = trimmed.split("/").filter((p) => p.length > 0 && p !== ".");
  if (parts.some((p) => p === "..")) {
    return { ok: false, error: "path must not contain .." };
  }
  if (!parts.length) return { ok: false, error: "path is empty" };
  const path = parts.join("/");
  if (path.length > 200) return { ok: false, error: "path too long" };
  return { ok: true, path };
}
