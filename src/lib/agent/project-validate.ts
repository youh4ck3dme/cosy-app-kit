/**
 * Deterministic project validation — no model claims.
 * Returns structured pass | fail | unverified with per-check evidence.
 */
import * as acorn from "acorn";
import {
  analyzeProjectRuntime,
  isMultiPageProject,
  type ProjectFile,
} from "@/lib/agent/project-runtime-gate";
import {
  findDuplicatePaths,
  normalizeProjectPath,
  type ProjectFsFile,
} from "@/lib/project-fs";

export type CheckStatus = "pass" | "fail" | "unverified";

export type ValidationCheck = {
  id: string;
  status: CheckStatus;
  evidence: string;
};

export type ProjectValidationResult = {
  status: CheckStatus;
  checks: ValidationCheck[];
  /** Legacy score from runtime gate (UI badges). */
  score: number;
  ok: boolean;
};

function toFiles(files: ProjectFile[] | ProjectFsFile[]): ProjectFsFile[] {
  return files.map((f) => ({ path: f.path, content: f.content ?? "" }));
}

function parseJavaScript(source: string, path: string): ValidationCheck {
  try {
    acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowReturnOutsideFunction: true,
    });
    return {
      id: `javascript-syntax:${path}`,
      status: "pass",
      evidence: `${path} parsed successfully`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: `javascript-syntax:${path}`,
      status: "fail",
      evidence: `${path}: ${msg}`,
    };
  }
}

function extractRefs(html: string): string[] {
  const refs: string[] = [];
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]!.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//") || raw.startsWith("data:") || raw.startsWith("javascript:")) {
      continue;
    }
    const noQuery = raw.split("?")[0]!.split("#")[0]!;
    refs.push(noQuery.replace(/^\.\//, ""));
  }
  return refs;
}

/**
 * Full static validation of a project package.
 */
export function validateProject(
  filesInput: ProjectFile[] | ProjectFsFile[],
  opts?: { entryPath?: string | null; toolsAvailable?: boolean },
): ProjectValidationResult {
  if (opts?.toolsAvailable === false) {
    return {
      status: "unverified",
      ok: false,
      score: 0,
      checks: [
        {
          id: "tools",
          status: "unverified",
          evidence: "UNVERIFIED: validation tools unavailable",
        },
      ],
    };
  }

  const files = toFiles(filesInput);
  const checks: ValidationCheck[] = [];

  if (!files.length) {
    checks.push({ id: "entry", status: "fail", evidence: "Package has no files" });
    return { status: "fail", checks, score: 0, ok: false };
  }

  const dups = findDuplicatePaths(files);
  checks.push(
    dups.length
      ? {
          id: "duplicate-paths",
          status: "fail",
          evidence: `Duplicate paths: ${dups.join(", ")}`,
        }
      : { id: "duplicate-paths", status: "pass", evidence: "No duplicate paths" },
  );

  for (const f of files) {
    const n = normalizeProjectPath(f.path);
    if (!n.ok) {
      checks.push({
        id: `path:${f.path}`,
        status: "fail",
        evidence: `Invalid path «${f.path}»: ${n.reason}`,
      });
    }
  }

  const pathSet = new Set(
    files
      .map((f) => normalizeProjectPath(f.path))
      .filter((r): r is { ok: true; path: string } => r.ok)
      .map((r) => r.path),
  );

  const entry =
    (opts?.entryPath && pathSet.has(opts.entryPath.replace(/^\.\//, ""))
      ? opts.entryPath.replace(/^\.\//, "")
      : null) ??
    [...pathSet].find((p) => /^index\.html?$/i.test(p)) ??
    [...pathSet].find((p) => /\.html?$/i.test(p)) ??
    null;

  checks.push(
    entry
      ? { id: "entry", status: "pass", evidence: `Entry file exists: ${entry}` }
      : { id: "entry", status: "fail", evidence: "No entry HTML file found" },
  );

  // Relative links / assets
  let dead = 0;
  for (const f of files) {
    if (!/\.html?$/i.test(f.path)) continue;
    for (const ref of extractRefs(f.content)) {
      const n = normalizeProjectPath(ref);
      if (!n.ok) {
        dead++;
        checks.push({
          id: `link:${f.path}->${ref}`,
          status: "fail",
          evidence: `Traversal or invalid ref «${ref}» from ${f.path}`,
        });
        continue;
      }
      if (!pathSet.has(n.path) && ![...pathSet].some((p) => p.endsWith("/" + n.path) || p.split("/").pop() === n.path.split("/").pop())) {
        dead++;
        checks.push({
          id: `link:${f.path}->${ref}`,
          status: "fail",
          evidence: `Missing file «${ref}» referenced from ${f.path}`,
        });
      }
    }
  }
  if (dead === 0) {
    checks.push({
      id: "relative-links",
      status: "pass",
      evidence: "All relative script/link/href targets resolve",
    });
  }

  // JS syntax via acorn
  for (const f of files) {
    if (!/\.m?js$/i.test(f.path)) continue;
    checks.push(parseJavaScript(f.content, f.path));
  }
  // Inline <script> blocks (non-src)
  for (const f of files) {
    if (!/\.html?$/i.test(f.path)) continue;
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(f.content)) !== null) {
      const body = m[1]?.trim() ?? "";
      if (!body) continue;
      i++;
      const c = parseJavaScript(body, `${f.path}#inline-${i}`);
      checks.push(c);
    }
  }

  const runtime = analyzeProjectRuntime(files);
  for (const h of runtime.hardFails.slice(0, 20)) {
    checks.push({
      id: `runtime:${h}`,
      status: "fail",
      evidence: h,
    });
  }

  if (isMultiPageProject(files) && pathSet.has("styles.css") === false && runtime.hardFails.includes("missing_styles_css")) {
    // already in runtime checks
  }

  const failed = checks.some((c) => c.status === "fail");
  const unverified = checks.some((c) => c.status === "unverified");
  const status: CheckStatus = failed ? "fail" : unverified ? "unverified" : "pass";

  return {
    status,
    checks,
    score: runtime.score,
    ok: status === "pass" && runtime.ok,
  };
}

export function formatUnverified(reason: string): string {
  return `UNVERIFIED: ${reason}`;
}
