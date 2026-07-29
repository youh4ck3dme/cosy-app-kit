/**
 * OmniOps ship-gates — CDN policy + wow-path testids.
 * Used by `bun run test:ship-gates` and CI.
 */

/** Bare script CDN hosts that preview CSP blocks. */
export const BARE_SCRIPT_CDN_HOSTS = /cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/gi;

/** Nearby phrasing that marks a CDN mention as a prohibition, not a recommendation. */
export const CDN_BAN_CONTEXT =
  /do\s*not|don't|never|no\s+cdn|must\s+not|blocks?\s+them|forbidden|avoid\s+bare|not\s+use\s+bare/i;

/** Critical wow-path testids that must exist somewhere under src/. */
export const REQUIRED_WOW_TESTIDS = [
  "landing-hero",
  "landing-how-it-works",
  "landing-feature-grid",
  "chat-composer",
  "chat-preview-toggle",
  "builder-canvas",
  "auth-sign-in",
] as const;

/** Prompt / seed sources scanned for bare CDN recommendations. */
export const CDN_SCAN_TARGETS = [
  "src/lib/models.ts",
  "src/lib/starters.ts",
  "src/lib/templates.seed.ts",
  "src/lib/agent/prompts.ts",
] as const;

export function previewCspAllowsBareScriptCdn(csp: string): boolean {
  return /script-src[^;]*(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)/i.test(csp);
}

/**
 * Find CDN host mentions that are NOT clearly banned in the surrounding window.
 * Mentions inside an explicit "Do NOT use … (cdn.jsdelivr…)" sentence pass.
 */
export function findUnapprovedCdnMentions(
  source: string,
  opts?: { windowChars?: number },
): Array<{ host: string; snippet: string }> {
  const windowChars = opts?.windowChars ?? 180;
  const findings: Array<{ host: string; snippet: string }> = [];
  const re = new RegExp(BARE_SCRIPT_CDN_HOSTS.source, "gi");
  for (const match of source.matchAll(re)) {
    const host = match[0]!;
    const idx = match.index ?? 0;
    const start = Math.max(0, idx - windowChars);
    const end = Math.min(source.length, idx + host.length + windowChars);
    const snippet = source.slice(start, end).replace(/\s+/g, " ").trim();
    if (!CDN_BAN_CONTEXT.test(snippet)) {
      findings.push({ host, snippet });
    }
  }
  return findings;
}
