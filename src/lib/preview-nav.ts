/**
 * Resolve in-preview <a href> targets for multi-file srcDoc artifacts.
 * Parent swaps srcDoc instead of letting the iframe navigate to a blank URL.
 */

export type PreviewNavResult =
  | { kind: "internal"; path: string; hash?: string }
  | { kind: "hash"; hash: string }
  | { kind: "external"; url: string }
  | { kind: "protocol"; url: string }
  | { kind: "ignore" };

const PROTOCOL_RE = /^(mailto|tel|sms|blob|data):/i;

/** Join href against current file dir; reject path traversal. */
export function joinArtifactPath(currentPath: string, hrefPath: string): string | null {
  let pathPart = hrefPath.split("?")[0] ?? "";
  pathPart = pathPart.trim();
  if (!pathPart) return null;

  if (pathPart.startsWith("/")) {
    pathPart = pathPart.replace(/^\/+/, "");
  } else {
    const slash = currentPath.lastIndexOf("/");
    const dir = slash >= 0 ? currentPath.slice(0, slash + 1) : "";
    pathPart = `${dir}${pathPart}`;
  }

  const parts = pathPart.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(p);
  }
  return out.join("/");
}

/** Find a file path in the artifact that matches a normalized relative path. */
export function matchArtifactFile(normalized: string, filePaths: string[]): string | null {
  if (!normalized || !filePaths.length) return null;

  if (filePaths.includes(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  const ci = filePaths.find((f) => f.toLowerCase() === lower);
  if (ci) return ci;

  if (!/\.html?$/i.test(normalized)) {
    const withHtml = matchArtifactFile(`${normalized}.html`, filePaths);
    if (withHtml) return withHtml;
    const withHtm = matchArtifactFile(`${normalized}.htm`, filePaths);
    if (withHtm) return withHtm;
  }

  const base = normalized.includes("/") ? normalized.slice(normalized.lastIndexOf("/") + 1) : normalized;
  const byBase = filePaths.filter((f) => {
    const fb = f.includes("/") ? f.slice(f.lastIndexOf("/") + 1) : f;
    return fb === base || fb.toLowerCase() === base.toLowerCase();
  });
  if (byBase.length === 1) return byBase[0]!;
  return null;
}

/**
 * Decide how the parent preview should handle an anchor href from srcDoc HTML.
 */
export function resolvePreviewNavTarget(
  href: string,
  opts: { filePaths: string[]; currentPath: string },
): PreviewNavResult {
  const raw = (href ?? "").trim();
  if (!raw || raw.toLowerCase().startsWith("javascript:")) return { kind: "ignore" };

  if (PROTOCOL_RE.test(raw)) return { kind: "protocol", url: raw };

  if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    return { kind: "external", url: raw.startsWith("//") ? `https:${raw}` : raw };
  }

  if (raw.startsWith("#")) {
    return { kind: "hash", hash: raw.slice(1) };
  }

  const hashIdx = raw.indexOf("#");
  const pathPart = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const hash = hashIdx >= 0 ? raw.slice(hashIdx + 1) : undefined;

  if (!pathPart.trim()) {
    return hash != null ? { kind: "hash", hash } : { kind: "ignore" };
  }

  const joined = joinArtifactPath(opts.currentPath, pathPart);
  if (joined == null) return { kind: "ignore" };

  const matched = matchArtifactFile(joined, opts.filePaths);
  if (!matched) return { kind: "ignore" };

  return hash ? { kind: "internal", path: matched, hash } : { kind: "internal", path: matched };
}
