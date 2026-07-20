import { DEFAULT_SYSTEM_PROMPT } from "@/lib/models";

/** Bump when system craft rules change (logged in composeSystem). */
export const PROMPT_REV = "2026-07-21-lmap";

export const SYSTEM_SHARED_STYLE = `## Output craft
- Prefer distinctive visual direction over generic AI dashboards.
- Mobile-first responsive CSS; accessible controls with aria-labels.
- Self-contained HTML with inline CSS unless the user asks otherwise.
(prompt_rev: ${PROMPT_REV})`;

export const SYSTEM_BUILD = `${DEFAULT_SYSTEM_PROMPT}

## Build mode
You can call tools to create or edit canvas artifacts. Prefer tools when iterating on an existing artifact (edit_file) instead of regenerating everything.
When tools are unavailable or unnecessary for a tiny one-shot page, you may still emit a \`\`\`html fence (fallback).
Never invent file paths you have not read via read_artifact.

## Multi-page mini-sites (launch_site)
When the user asks for a multi-page site / celý web / Home+About+Contact+Pricing (or Cenník), call **launch_site** with a clear brief.
Do NOT fake multi-page with one HTML file and dead nav links — use launch_site so the canvas gets real index/about/contact/pricing files.
For a single landing page or dashboard, prefer create_artifact (or a html fence) instead.

## Pre-finish mobile checklist
Before you finish HTML, verify:
1) viewport meta present
2) base layout is single-column for ~360–430px
3) sidebar/nav closed by default under 768px (hamburger)
4) no min-width on wrappers that forces horizontal scroll
5) charts/cards full-width under 768px`;

export const SYSTEM_PLAN = `You are Builder in PLAN MODE. Do NOT write full code, do NOT emit fenced HTML/code artifacts, and do NOT call create_artifact, edit_file, or launch_site.

Produce a crisp plan:
1. Goal in one sentence.
2. Concrete steps (max 8) with files/areas involved.
3. Risks, unknowns, and what to verify.
End with one question inviting the user to confirm or adjust before Build.

You may call plan_steps to structure the plan, and remember/read_artifact when helpful.
Optional: fetch_url / web_search when those tools are enabled for grounding.`;

export const BUILD_FENCE_SUFFIX = `\n\nWhen emitting code without tools, use ONE of:
- A single self-contained HTML document in a \`\`\`html fenced block.
- Multi-file \`\`\`lang path=<relative/path>\`\`\` blocks with index.html as entry when possible.`;

/** One-tap Canvas polish prompt (MR-40 M3). */
export const MOBILE_FIRST_POLISH_PROMPT = `Rewrite this artifact mobile-first for 390px phones:
1) single column layout
2) sidebar/nav closed by default with a hamburger/toggle
3) no horizontal page scroll
4) charts and KPI cards full width under 768px
5) keep existing colors/brand
Use edit_file on the current artifact when possible — do not recreate from scratch unless necessary.`;

export type ClientPreviewContext = {
  previewMode?: string;
  hostWidth?: number;
};

/** Safe system appendix from client viewport (no PII). */
export function formatClientContext(ctx?: ClientPreviewContext | null): string {
  if (!ctx) return "";
  const w =
    typeof ctx.hostWidth === "number" && Number.isFinite(ctx.hostWidth) && ctx.hostWidth > 0
      ? Math.round(ctx.hostWidth)
      : null;
  const mode =
    typeof ctx.previewMode === "string" && ctx.previewMode.trim()
      ? ctx.previewMode.trim().slice(0, 32)
      : null;
  if (w == null && !mode) return "";
  const widthBit = w != null ? `~${w}px host width` : "unknown host width";
  const modeBit = mode ? `preview mode: ${mode}` : "preview mode: unknown";
  return `\n\n## Client viewport\nUser is viewing the Builder canvas at ${widthBit} (${modeBit}). Optimize first-paint HTML for phones (~360–430px) unless they explicitly asked for desktop-only.`;
}

export function composeSystem(
  mode: "build" | "plan",
  basePrompt: string | null | undefined,
  memoryBlock: string,
  clientContextBlock = "",
): string {
  const base = (basePrompt?.trim() || DEFAULT_SYSTEM_PROMPT).trim();
  const shared = `\n\n${SYSTEM_SHARED_STYLE}`;
  const mem = memoryBlock.trim() ? `\n\n${memoryBlock.trim()}` : "";
  const client = clientContextBlock.trim() ? clientContextBlock : "";
  if (mode === "plan") {
    return `${base}${shared}${mem}${client}\n\n${SYSTEM_PLAN}`;
  }
  return `${base}${shared}${mem}${client}\n\n${SYSTEM_BUILD}${BUILD_FENCE_SUFFIX}`;
}
