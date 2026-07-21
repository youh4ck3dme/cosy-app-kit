/**
 * Static quality gate for multi-file project artifacts (FleetOps-class apps).
 * Regex / string checks only — no browser. Never blocks persist; scores + hints.
 *
 * Targets failure modes from real Project Mode exports:
 * - dead relative links / hash-only multi-page nav
 * - external CDN deps when offline zip is expected
 * - alert() / inline onclick
 * - defaultState mutation without structuredClone
 * - missing per-page DOM guards
 * - broken shared app.js / styles.css references
 */

export type ProjectFile = { path: string; content: string };

export type ProjectRuntimeReport = {
  score: number;
  ok: boolean;
  hardFails: string[];
  softFails: string[];
  hints: string[];
  fileCount: number;
  htmlPages: string[];
  externalUrlCount: number;
};

const OK_THRESHOLD = 70;

function basename(path: string): string {
  const p = path.replace(/\\/g, "/");
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

function normalizePath(path: string): string {
  return path.replace(/^\.\//, "").replace(/\\/g, "/");
}

function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

function isJsPath(path: string): boolean {
  return /\.m?js$/i.test(path);
}

function collectExternalUrls(text: string): string[] {
  const out: string[] = [];
  const re = /https?:\/\/[^\s"'`<>)]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const u = m[0].replace(/[.,;]+$/, "");
    // Allow data: already excluded; skip obvious non-network noise
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(u)) continue;
    out.push(u);
  }
  return out;
}

function extractLocalHtmlHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = /(?:href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]!.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }
    if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) continue;
    if (raw.startsWith("data:") || raw.startsWith("javascript:")) continue;
    const noQuery = raw.split("?")[0]!.split("#")[0]!;
    if (/\.html?$/i.test(noQuery) || noQuery.endsWith(".css") || noQuery.endsWith(".js")) {
      hrefs.push(normalizePath(noQuery));
    }
  }
  return hrefs;
}

function extractScriptAndLinkRefs(html: string): string[] {
  const refs: string[] = [];
  const re =
    /(?:src|href)\s*=\s*["'](\.\/)?([^"']+\.(?:js|css|html?))["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    refs.push(normalizePath(m[2]!));
  }
  return refs;
}

function hasHashPageNav(html: string): boolean {
  // Multi-page apps often wrongly use href="#vehicles" instead of vehicles.html
  return /href\s*=\s*["']#[a-z][\w-]{1,40}["']/i.test(html);
}

function jsSyntaxHeuristics(js: string): string[] {
  const fails: string[] = [];
  // The real FleetOps bug: stray character before `if` glued after statement
  if (/;\s*n\s*if\s*\(/m.test(js) || /\)n\s*if\s*\(/m.test(js) || /availableVehicles[^;]*;n\s*if/m.test(js)) {
    fails.push("js_stray_n_before_if");
  }
  // Unbalanced braces (rough)
  const open = (js.match(/\{/g) ?? []).length;
  const close = (js.match(/\}/g) ?? []).length;
  if (Math.abs(open - close) > 0) {
    fails.push("js_unbalanced_braces");
  }
  return fails;
}

/**
 * Analyze a multi-file project package for runtime / export readiness.
 * Single-file pure HTML still gets light checks but multi-page is the focus.
 */
export function analyzeProjectRuntime(files: ProjectFile[]): ProjectRuntimeReport {
  const hardFails: string[] = [];
  const softFails: string[] = [];
  const hints: string[] = [];

  if (!files.length) {
    return {
      score: 0,
      ok: false,
      hardFails: ["empty_package"],
      softFails: [],
      hints: ["Package has no files."],
      fileCount: 0,
      htmlPages: [],
      externalUrlCount: 0,
    };
  }

  const normalized = files.map((f) => ({
    path: normalizePath(f.path),
    content: f.content ?? "",
  }));
  const pathSet = new Set(normalized.map((f) => f.path));
  const byBase = new Map(normalized.map((f) => [basename(f.path), f.path]));
  const htmlPages = normalized.filter((f) => isHtmlPath(f.path)).map((f) => f.path);
  const jsFiles = normalized.filter((f) => isJsPath(f.path));
  const multiPage = htmlPages.length >= 2;

  let externalUrlCount = 0;
  for (const f of normalized) {
    // README may mention example URLs — count soft only
    const urls = collectExternalUrls(f.content);
    if (!urls.length) continue;
    if (/\.md$/i.test(f.path)) {
      softFails.push(`readme_external_urls_${urls.length}`);
    } else {
      externalUrlCount += urls.length;
    }
  }
  if (externalUrlCount > 0) {
    softFails.push(`external_urls_${externalUrlCount}`);
    hints.push(
      "Avoid external http(s) CDN URLs in offline-export packages — prefer inline CSS/JS or local files.",
    );
  }

  // Dead local references from HTML
  for (const page of normalized.filter((f) => isHtmlPath(f.path))) {
    const refs = [
      ...extractLocalHtmlHrefs(page.content),
      ...extractScriptAndLinkRefs(page.content),
    ];
    for (const ref of refs) {
      if (pathSet.has(ref) || byBase.has(basename(ref))) continue;
      // self-relative ok if basename exists
      hardFails.push(`dead_link:${page.path}->${ref}`);
      hints.push(`Fix dead link «${ref}» from ${page.path} — file missing from package.`);
    }
    if (multiPage && hasHashPageNav(page.content)) {
      softFails.push(`hash_nav:${page.path}`);
      hints.push(
        `Use real multi-page files (vehicles.html) instead of hash nav (#vehicles) in ${page.path}.`,
      );
    }
    if (/\bonclick\s*=/i.test(page.content)) {
      hardFails.push(`inline_onclick:${page.path}`);
      hints.push(`Remove inline onclick in ${page.path}; use data-action + addEventListener.`);
    }
  }

  // Shared app scripts
  for (const js of jsFiles) {
    const content = js.content;
    if (/\balert\s*\(/m.test(content)) {
      hardFails.push(`alert_call:${js.path}`);
      hints.push(`Remove alert() from ${js.path}; use an inline status toast.`);
    }
    for (const h of jsSyntaxHeuristics(content)) {
      hardFails.push(`${h}:${js.path}`);
      if (h === "js_stray_n_before_if") {
        hints.push(`Syntax corruption in ${js.path} (stray "n" before if) — re-emit clean JS.`);
      } else {
        hints.push(`Check brace balance / syntax in ${js.path}.`);
      }
    }
    // defaultState returned/mutated without structuredClone
    if (/\bdefaultState\b/.test(content)) {
      if (!/structuredClone\s*\(\s*defaultState\s*\)/.test(content)) {
        hardFails.push(`no_structured_clone:${js.path}`);
        hints.push(
          `Use structuredClone(defaultState) for load/reset — never return or mutate defaultState directly (${js.path}).`,
        );
      }
      if (/return\s+defaultState\b/.test(content)) {
        hardFails.push(`returns_default_state:${js.path}`);
        hints.push(`Do not return defaultState reference from loadState/resetState (${js.path}).`);
      }
    }
    // DOM writes without existence guards (heuristic: updateX calls getElementById and assigns .textContent/innerHTML in same function without if)
    if (
      multiPage &&
      /function\s+updateDashboard\s*\([^)]*\)\s*\{[^}]*getElementById\([^)]+\)\.(textContent|innerHTML)/s.test(
        content,
      ) &&
      !/function\s+updateDashboard\s*\([^)]*\)\s*\{[^}]*if\s*\(\s*[^)]*getElementById/s.test(content) &&
      !/function\s+updateDashboard[\s\S]{0,400}if\s*\(\s*!?\s*(isDashboard|document\.getElementById)/.test(
        content,
      )
    ) {
      softFails.push(`dashboard_no_guard:${js.path}`);
      hints.push(
        "Guard page init: run updateDashboard only when dashboard nodes exist (index.html).",
      );
    }
    if (/\.innerHTML\s*=/.test(content) && multiPage) {
      softFails.push(`innerHTML_assign:${js.path}`);
      hints.push(
        `Prefer createElement + textContent over innerHTML for state-driven lists (${js.path}).`,
      );
    }
    if (multiPage && !/addEventListener\s*\(\s*["']click["']/.test(content) && /data-action|onclick/.test(content)) {
      softFails.push(`weak_event_delegation:${js.path}`);
    }
    if (multiPage && /localStorage/.test(content) && !/try\s*\{[\s\S]*localStorage/.test(content)) {
      softFails.push(`localStorage_no_try:${js.path}`);
      hints.push(`Wrap localStorage in try/catch (${js.path}).`);
    }
  }

  // Multi-page packages should ship shared assets when referenced
  if (multiPage) {
    const allHtml = htmlPages
      .map((p) => normalized.find((f) => f.path === p)?.content ?? "")
      .join("\n");
    if (/app\.js/.test(allHtml) && !pathSet.has("app.js") && !byBase.has("app.js")) {
      hardFails.push("missing_app_js");
      hints.push("HTML references app.js but package has no app.js.");
    }
    if (/styles\.css/.test(allHtml) && !pathSet.has("styles.css") && !byBase.has("styles.css")) {
      hardFails.push("missing_styles_css");
      hints.push("HTML references styles.css but package has no styles.css.");
    }
    if (!jsFiles.length && /localStorage|assignVehicle|updateDashboard/.test(allHtml)) {
      softFails.push("logic_in_inline_only");
      hints.push("Prefer a shared app.js for cross-page state + localStorage.");
    }
  }

  // Score
  let score = 100;
  score -= hardFails.length * 18;
  score -= softFails.length * 6;
  if (multiPage && hardFails.length === 0) score = Math.min(100, score + 5);
  score = Math.max(0, Math.min(100, score));

  const ok = score >= OK_THRESHOLD && hardFails.length === 0;

  if (!ok && !hints.length) {
    hints.push("Fix hard project-runtime failures before treating the zip as acceptance-ready.");
  }

  return {
    score,
    ok,
    hardFails: [...new Set(hardFails)].slice(0, 40),
    softFails: [...new Set(softFails)].slice(0, 40),
    hints: [...new Set(hints)].slice(0, 12),
    fileCount: normalized.length,
    htmlPages,
    externalUrlCount,
  };
}

/** True when package looks like a multi-page project (zip export path). */
export function isMultiPageProject(files: ProjectFile[]): boolean {
  const html = files.filter((f) => isHtmlPath(f.path)).length;
  return html >= 2 || files.length >= 3;
}
