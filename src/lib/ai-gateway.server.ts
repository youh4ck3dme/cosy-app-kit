import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const AVAILABLE_MODELS: Array<{
  id: string;
  label: string;
  note?: string;
}> = [
  { id: "openai/gpt-5.5", label: "GPT-5.5", note: "Opus-class · Default" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", note: "Balanced reasoning" },
  { id: "openai/gpt-5.4-mini", label: "GPT-5.4 mini", note: "Fast" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", note: "Fast multimodal" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", note: "Deep reasoning" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Cheap" },
];

export const DEFAULT_MODEL = "openai/gpt-5.5";
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_SYSTEM_PROMPT = `You are Builder, a helpful, precise AI agent. When the user asks for a webpage, component, or design, respond with a short explanation and then emit a FULL self-contained HTML document inside a \`\`\`html fenced block so it can be rendered in the live canvas. Use inline <style>, tasteful modern design, semantic HTML, and accessible markup. If the request is not visual, just chat normally.`;
