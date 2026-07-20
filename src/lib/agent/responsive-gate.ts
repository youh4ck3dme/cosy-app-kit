/**
 * Fast static HTML responsive quality gate (MR-40 M2).
 * Regex-only — no DOM / Puppeteer. Never blocks persist; scores + hints only.
 */

export type ResponsiveReport = {
  score: number;
  ok: boolean;
  hardFails: string[];
  softFails: string[];
  hints: string[];
};

const OK_THRESHOLD = 70;

export function analyzeResponsiveHtml(html: string): ResponsiveReport {
  const hardFails: string[] = [];
  const softFails: string[] = [];
  const hints: string[] = [];

  if (!html || !html.trim()) {
    return {
      score: 0,
      ok: false,
      hardFails: ["empty_html"],
      softFails: [],
      hints: ["Generate a full HTML document with viewport meta and mobile styles."],
    };
  }

  const lower = html.toLowerCase();

  // Hard: viewport meta
  const hasViewport =
    /<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i.test(html) ||
    /<meta[^>]+content\s*=\s*["'][^"']*width\s*=\s*device-width[^"']*["'][^>]*>/i.test(html);
  if (!hasViewport) {
    hardFails.push("missing_viewport");
    hints.push('Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  }

  // Hard: real responsive strategy (not mere fixed min-width:1200 on body)
  const hasMedia =
    /@media\s*\(/i.test(html) ||
    /\b(sm|md|lg|xl):[a-z]/i.test(html); // Tailwind responsive variants
  if (!hasMedia) {
    hardFails.push("no_media_queries");
    hints.push("Add @media (max-width: 768px) or mobile-first min-width breakpoints.");
  }

  // Soft: fixed min-width on root-ish wrappers
  const minWidthHits = [
    ...html.matchAll(
      /(?:body|html|main|\.wrapper|\.container|#app|#root)[^{}]*\{[^}]*min-width\s*:\s*(\d+)px/gi,
    ),
  ];
  for (const m of minWidthHits) {
    const n = Number(m[1]);
    if (n > 480) {
      softFails.push(`large_min_width_${n}`);
      hints.push(`Avoid min-width: ${n}px on page wrappers — use max-width / 100%.`);
      break;
    }
  }

  // Soft: inline min-width style large
  if (/style\s*=\s*["'][^"']*min-width\s*:\s*(6\d{2}|[7-9]\d{2}|[1-9]\d{3,})px/i.test(html)) {
    softFails.push("inline_large_min_width");
    hints.push("Large inline min-width forces horizontal scroll on phones.");
  }

  // Soft: sidebar without collapse affordance
  const hasSidebar = /\bsidebar\b/i.test(html) || /class=["'][^"']*sidebar/i.test(html);
  const hasCollapse =
    /\b(hamburger|nav-toggle|menu-toggle|sidebar-toggle|drawer)\b/i.test(html) ||
    /aria-expanded/i.test(html) ||
    /id=["']nav-toggle/i.test(html);
  if (hasSidebar && !hasCollapse) {
    softFails.push("sidebar_no_collapse");
    hints.push("Sidebar without hamburger/toggle — collapse nav by default under 768px.");
  }

  // Soft: no mobile-first hint when only desktop max-width media missing min paths
  // (informational — already covered by hasMedia)

  // Score
  let score = 100;
  score -= hardFails.length * 30;
  score -= softFails.length * 12;
  if (hasViewport && hasMedia && softFails.length === 0) score = Math.max(score, 90);
  score = Math.max(0, Math.min(100, score));

  const ok = score >= OK_THRESHOLD && hardFails.length === 0;

  if (!ok && hints.length === 0) {
    hints.push("Improve mobile layout: single column, closed sidebar, no horizontal scroll.");
  }

  // Dedupe hints
  const uniqHints = [...new Set(hints)].slice(0, 5);

  return {
    score,
    ok,
    hardFails,
    softFails,
    hints: uniqHints,
  };
}

export { OK_THRESHOLD as RESPONSIVE_OK_THRESHOLD };
