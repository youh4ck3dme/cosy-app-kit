/** Client-safe model catalog — Mistral only (no OpenAI / ChatGPT / Gemini). */

export const AVAILABLE_MODELS: Array<{
  id: string;
  label: string;
  note?: string;
}> = [
  { id: "mistral-small-latest", label: "Mistral Small", note: "Fast · cheap" },
  { id: "mistral-medium-latest", label: "Mistral Medium", note: "Balanced" },
  { id: "mistral-large-latest", label: "Mistral Large", note: "Best quality · Default" },
  { id: "codestral-latest", label: "Codestral", note: "Code-focused" },
  { id: "open-mistral-nemo", label: "Mistral Nemo", note: "Open weights" },
  { id: "pixtral-large-latest", label: "Pixtral Large", note: "Vision" },
];

export const DEFAULT_MODEL = "mistral-large-latest";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_SYSTEM_PROMPT = `You are Builder, a helpful, precise AI agent powered by Mistral. When the user asks for a webpage, component, or design, respond with a short explanation and then emit a FULL self-contained HTML document inside a \`\`\`html fenced block so it can be rendered in the live canvas. Use inline <style>, tasteful modern design, semantic HTML, and accessible markup. If the request is not visual, just chat normally.`;

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
