import { DEFAULT_SYSTEM_PROMPT } from "@/lib/models";

/** Bump when system craft rules change (logged in composeSystem). */
export const PROMPT_REV = "2026-07-21-project-runtime";

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
When the user asks for a multi-page marketing site / celý web / Home+About+Contact+Pricing (or Cenník), call **launch_site** with a clear brief.
Do NOT fake multi-page with one HTML file and dead nav links — use launch_site so the canvas gets real index/about/contact/pricing files.
For a single landing page or dashboard, prefer create_artifact (or a html fence) instead.

## Project mode — multi-page apps (FleetOps-class)
When the user wants an **app** with multiple real pages (e.g. Dashboard + Vehicles + Drivers + Maintenance + Incidents), shared state, workflows, and a downloadable ZIP:
1. Call **create_artifact once** with ALL files in one package (do not split into separate artifacts per page).
2. Ship real files, typically: several \`*.html\`, shared \`styles.css\`, shared \`app.js\`, optional \`README.md\`.
3. Navigation MUST use relative file links (\`vehicles.html\`), NEVER hash routes (\`#vehicles\`) and NEVER invent pages that are not in the package.
4. No external CDN/URLs unless the user explicitly allows them — ZIP must work offline.
5. Shared \`app.js\` rules (hard):
   - Valid JS only (no corrupted tokens like a stray \`n\` before \`if\`).
   - \`defaultState\` is immutable seed: always \`structuredClone(defaultState)\` for load/reset; never return or mutate \`defaultState\` itself.
   - Page init is DOM-safe: \`updateDashboard\` only when dashboard nodes exist; list renderers only if their container \`#id\` exists; never write to null.
   - Persistence via localStorage in try/catch; assignment/status changes must survive reload.
   - No \`alert()\`; use an inline status/toast node (\`createElement\` + \`textContent\`).
   - No inline \`onclick\` attributes; use \`data-action\` / \`data-id\` + one delegated \`click\` listener.
   - Dynamic lists: \`document.createElement\` + \`textContent\` — do not inject state strings via \`innerHTML\`.
6. Workflows must be consistent across pages (example patterns):
   - Assign vehicle → one Available vehicle per driver; vehicle status Assigned + assignedDriverId; driver.assignedVehicle set; free previous vehicle on reassign.
   - Set to Maintenance → vehicle Maintenance + Pending maintenance record; Complete → record Completed + vehicle Available.
   - Resolve incident → Resolved; idempotent on repeat click.
7. README may only document behavior that actually works in the package.
8. After create_artifact, if the tool returns quality.hardFails / low score, fix with edit_file before finishing.

## Pre-finish mobile checklist
Before you finish HTML, verify:
1) viewport meta present
2) base layout is single-column for ~360–430px
3) sidebar/nav closed by default under 768px (hamburger)
4) no min-width on wrappers that forces horizontal scroll
5) charts/cards full-width under 768px

## Pre-finish project ZIP checklist (multi-file apps)
1) Every href/src targets a file that exists in the artifact
2) \`node --check\`-clean app.js (balanced braces, no stray characters)
3) Cross-page localStorage workflows survive reload
4) No alert / no inline onclick / no dead hash nav
5) Dashboard KPI re-reads storage on index.html`;

export const SYSTEM_PLAN = `You are Builder in PLAN MODE. Do NOT write full code, do NOT emit fenced HTML/code artifacts, and do NOT call create_artifact, edit_file, or launch_site.

Produce a crisp plan:
1. Goal in one sentence.
2. Concrete steps (max 8) with files/areas involved.
3. Risks, unknowns, and what to verify.
End with one question inviting the user to confirm or adjust before Build.

You may call plan_steps to structure the plan, and remember/read_artifact when helpful.
When calling plan_steps: each step/risk/question must be a SHORT bullet (aim ≤200 characters, hard max ~300). Max 8 steps. Put the long narrative in your chat text, not inside the tool args.
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

/** One-tap: dark/light theme without rewriting the app. */
export const THEME_TOGGLE_POLISH_PROMPT = `Build mode. On the CURRENT artifact (edit_file / read_artifact first — do NOT recreate from scratch):
1) Add a dark/light theme toggle in a sensible header/settings spot
2) Drive colors via CSS variables (e.g. data-theme="dark"|"light" on <html> or <body>)
3) Persist preference in localStorage; default to dark if unset
4) Keep existing brand accents and layout; do not invent a new palette from scratch
5) Ensure contrast stays readable in both themes
Do not change core business logic.`;

/** One-tap: accessibility + a few keyboard shortcuts. */
export const A11Y_POLISH_PROMPT = `Build mode. On the CURRENT artifact (edit_file — do NOT recreate):
1) Every interactive control has an accessible name (label / aria-label)
2) Visible :focus-visible rings; Escape closes modals/drawers/palettes
3) Forms associate <label> with inputs; errors are announced (aria-live or role=alert)
4) Add 3–5 keyboard shortcuts for common actions (document them in a small Shortcuts hint)
5) Do not remove existing features; keep colors/brand
Do not change core business logic.`;

/** One-tap: denser visual system — spacing, type, CSS vars (not a design canvas). */
export const VISUAL_SYSTEM_POLISH_PROMPT = `Build mode. On the CURRENT artifact (edit_file — do NOT recreate):
1) Introduce a small design token set as CSS variables (bg, surface, border, text, accent, radius, space)
2) Consistent spacing rhythm; cards/sections align to a simple grid/flex system
3) Typography scale (title / body / mono meta) — no random font sizes
4) Touch targets ≥44px where primary actions exist
5) Keep existing brand/accent; no drag-and-drop shape editor, no fake analytics widgets
Do not change core business logic.`;

/** One-tap: practical export/share without new backends. */
export const EXPORT_SHARE_POLISH_PROMPT = `Build mode. On the CURRENT artifact (edit_file — do NOT recreate):
1) Add a "Download HTML" (or ZIP-of-files if multi-file) control that exports the current app state/files the user can save
2) Add print-friendly CSS (@media print) so Print → PDF works for the main view
3) Optional: copy-share text (booking id / deep link hash) if the app already has an ID concept
4) No external CDN; no analytics; no Figma/Adobe integrations
5) Keep existing flows intact
Do not change core business logic.`;

/** One-tap: background color/pattern toggle, scoped to a settings panel (not a design canvas). */
export const BACKGROUND_POLISH_PROMPT = `Build mode. On the CURRENT artifact (edit_file — do NOT recreate):
1) Add a background color/pattern control in an existing settings/options panel (create a minimal one only if none exists)
2) Drive it via a CSS variable on <html> or <body>; persist the choice in localStorage
3) Offer a small fixed set of presets (e.g. solid, subtle gradient, soft grid/dot pattern) — no image upload, no external assets
4) Keep readable contrast against existing text/surface colors in both themes if a theme toggle exists
5) No drag-and-drop canvas, no free-form shape/pattern editor
Do not change core business logic.`;

/** Catalog for one-tap Canvas polish actions (UI + tests). */
export const ARTIFACT_POLISH_ACTIONS = [
  {
    id: "mobile-first",
    label: "Mobile-first",
    title: "Ask Builder to rewrite layout mobile-first",
    prompt: MOBILE_FIRST_POLISH_PROMPT,
  },
  {
    id: "theme",
    label: "Theme",
    title: "Ask Builder to add dark/light theme toggle",
    prompt: THEME_TOGGLE_POLISH_PROMPT,
  },
  {
    id: "a11y",
    label: "A11y",
    title: "Ask Builder to improve accessibility and shortcuts",
    prompt: A11Y_POLISH_PROMPT,
  },
  {
    id: "visual",
    label: "Visual",
    title: "Ask Builder to tighten spacing, type, and CSS tokens",
    prompt: VISUAL_SYSTEM_POLISH_PROMPT,
  },
  {
    id: "export",
    label: "Export",
    title: "Ask Builder to add download/print export helpers",
    prompt: EXPORT_SHARE_POLISH_PROMPT,
  },
  {
    id: "background",
    label: "Background",
    title: "Ask Builder to add a background color/pattern option",
    prompt: BACKGROUND_POLISH_PROMPT,
  },
] as const;

export type ArtifactPolishActionId = (typeof ARTIFACT_POLISH_ACTIONS)[number]["id"];

/**
 * One-tap polish for multi-file project packages (FleetOps-class runtime).
 * Prefer edit_file on existing files — keep file count and nav labels stable.
 */
export const PROJECT_RUNTIME_POLISH_PROMPT = `Build mode. Fix the CURRENT multi-file artifact so the exported ZIP is acceptance-ready.
Do NOT create a new project/artifact. Keep the same file set and page names/nav.
Hard requirements:
1) Valid app.js (no syntax errors; no stray characters before if)
2) structuredClone(defaultState) for load/reset — never mutate/return defaultState
3) DOM-safe page init: only update nodes that exist on the current page
4) Vehicle assignment: Available → Assigned for exactly one driver; persist assignedDriverId + assignedVehicle; free previous vehicle
5) Maintenance: Set to Maintenance creates/activates Pending; Complete → Completed + vehicle Available; persist
6) Incidents: Resolve → Resolved; repeat is safe; persist
7) No alert(); inline status toast only
8) No inline onclick; data-action + delegated click listeners
9) createElement/textContent for dynamic lists (no state via innerHTML)
10) Every local href/src must exist in the package; no hash multi-page nav; no extra external URLs
11) Dashboard KPI on index.html must reflect latest localStorage after navigation
Use edit_file (and read_artifact first). Update README only to match real behavior.`;

export type ClientPreviewContext = {
  previewMode?: string;
  hostWidth?: number;
  /** Currently focused canvas artifact (UUID) — prefer for QA / edit tools. */
  activeArtifactId?: string;
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
  const active =
    typeof ctx.activeArtifactId === "string" &&
    /^[0-9a-f-]{36}$/i.test(ctx.activeArtifactId.trim())
      ? ctx.activeArtifactId.trim()
      : null;
  if (w == null && !mode && !active) return "";
  const widthBit = w != null ? `~${w}px host width` : "unknown host width";
  const modeBit = mode ? `preview mode: ${mode}` : "preview mode: unknown";
  const artifactBit = active
    ? `\nActive canvas artifactId: ${active}. For QA/edits prefer list_project_files / read_project_file / validate_* on this id — do not invent file contents. If a validate tool is unavailable, reply UNVERIFIED: <reason> (never assume PASS).`
    : `\nNo active artifact id from client. Discover via read_artifact / list_project_files before claiming file contents. If tools are unavailable, reply UNVERIFIED: <reason>.`;
  return `\n\n## Client viewport\nUser is viewing the Builder canvas at ${widthBit} (${modeBit}). Optimize first-paint HTML for phones (~360–430px) unless they explicitly asked for desktop-only.${artifactBit}`;
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
