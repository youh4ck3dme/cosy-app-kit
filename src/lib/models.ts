/** Client-safe model catalog — Mistral only (no OpenAI / ChatGPT / Gemini). */

export const AVAILABLE_MODELS: Array<{
  id: string;
  label: string;
  note?: string;
}> = [
  { id: "mistral-small-latest", label: "Mistral Small", note: "Fast · cheap" },
  { id: "mistral-medium-latest", label: "Mistral Medium", note: "Balanced" },
  { id: "mistral-large-latest", label: "Mistral Large", note: "Best quality · Plan" },
  { id: "codestral-latest", label: "Codestral", note: "Code · Default Build" },
  { id: "open-mistral-nemo", label: "Mistral Nemo", note: "Open weights" },
  { id: "pixtral-large-latest", label: "Pixtral Large", note: "Vision" },
];

/** Default for new threads / settings (quality reasoning + Plan). */
export const DEFAULT_MODEL = "mistral-large-latest";
/** Preferred when Build mode generates HTML/code (faster, code-focused). */
export const BUILD_CODE_MODEL = "codestral-latest";
/** Follow-up suggestion chips (cheap). */
export const SUGGESTION_MODEL = "mistral-small-latest";

export const DEFAULT_TEMPERATURE = 0.7;

export const DEFAULT_SYSTEM_PROMPT = `You are Builder, a precise product engineer powered by Mistral.

When the user asks for a webpage, UI, or visual design:
1. Give a short (1–3 sentence) explanation.
2. Emit ONE full self-contained HTML document in a single \`\`\`html fenced block (or multi-file \`\`\`lang path=...\`\`\` blocks with an index.html entry).

Hard quality rules for HTML artifacts:
- Prefer inline <style> (self-contained). Use Tailwind CDN only if the user explicitly asks for Tailwind.
- Include <meta name="viewport" content="width=device-width, initial-scale=1">.
- **Mobile-first layout (required):** write base styles for ~360–430px phones first, then enhance with @media (min-width: 768px) and @media (min-width: 1024px). Do NOT ship a desktop-only grid that merely squeezes on small screens.
- On small screens: single column; sidebar/nav collapsed behind a hamburger (closed by default); no horizontal page scroll; avoid fixed min-width on body/main/wrapper wider than 100%.
- At max-width 767px: stack KPI cards, full-width charts, readable type (≥14px body), primary controls ≥44px touch targets.
- Semantic HTML; icon-only buttons need aria-label.
- Avoid cliché “AI SaaS” looks: no default purple-on-dark (#6c5ce7 / indigo-600) unless the user asks for purple. Pick a distinctive palette (earth, ink, forest, coral, slate+gold, etc.) with CSS variables.
- Avoid Inter / system-ui / Segoe as the only typography story — use a distinctive font stack or a well-known Google Font that fits the brand.
- For dashboards/charts: use Chart.js (CDN) with real numeric datasets, not static SVG fake charts. Week/Month/Year controls should update chart data.
- focus-visible outlines on interactive controls.
- If the request is not visual, just chat normally — no empty fences.`;

const KNOWN = new Set(AVAILABLE_MODELS.map((m) => m.id));

/** Map legacy OpenAI/Gemini/Lovable gateway ids → current Mistral default. */
export function resolveKnownModelId(raw: string | null | undefined): string {
  const id = (raw ?? "").trim();
  if (id && KNOWN.has(id)) return id;
  return DEFAULT_MODEL;
}

export function isMistralModelId(id: string | null | undefined): boolean {
  return !!id && KNOWN.has(id);
}

/**
 * Mode-aware routing: Build prefers Codestral when the thread still uses the
 * generic Large default (or legacy ids). Explicit user picks (Small, Pixtral, …) are kept.
 */
export function resolveModelForMode(
  raw: string | null | undefined,
  mode: "build" | "plan",
): string {
  const id = resolveKnownModelId(raw);
  if (mode === "plan") return id === BUILD_CODE_MODEL ? DEFAULT_MODEL : id;
  // Build: bump Large default → Codestral for speed/quality on code.
  if (id === DEFAULT_MODEL || id === "mistral-medium-latest") return BUILD_CODE_MODEL;
  return id;
}
