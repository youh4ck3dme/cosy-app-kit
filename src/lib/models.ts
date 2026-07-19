/** Client-safe model catalog (no API keys, no Mistral SDK). */

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
