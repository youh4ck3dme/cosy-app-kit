import { createMistral } from "@ai-sdk/mistral";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
} from "@/lib/models";

// Re-export catalog so server routes can import from one place.
export {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
} from "@/lib/models";

/**
 * Direct Mistral API only — no Lovable AI Gateway, no OpenAI, no ChatGPT.
 * Server-only. Key: process.env.MISTRAL_API_KEY
 * Docs: https://docs.mistral.ai/
 */
export function createMistralProvider(apiKey: string) {
  return createMistral({
    apiKey,
  });
}

/** Map Mistral/API failures to a short, actionable message for the UI stream. */
export function formatAiGatewayError(error: unknown): string {
  if (error == null) return "Unknown AI error.";

  const anyErr = error as {
    message?: string;
    statusCode?: number;
    status?: number;
    responseBody?: string;
  };

  const status = anyErr.statusCode ?? anyErr.status;
  const raw =
    anyErr.message ||
    (typeof anyErr.responseBody === "string" ? anyErr.responseBody : "") ||
    (error instanceof Error ? error.message : String(error));

  if (status === 402 || /payment required|insufficient.?credit|quota/i.test(raw)) {
    return "Mistral quota/billing issue (402). Check https://console.mistral.ai/ billing and usage.";
  }
  if (status === 429 || /rate limit|too many requests/i.test(raw)) {
    return "Mistral rate limit (429). Slow down or upgrade plan at console.mistral.ai.";
  }
  if (status === 401 || status === 403 || /unauthorized|invalid.?api.?key|forbidden/i.test(raw)) {
    return "Mistral auth failed. Set a valid MISTRAL_API_KEY (server env / secret). Never use Lovable AI or OpenAI keys.";
  }
  if (status === 404 || /model.?not.?found|does not exist|unknown model|invalid_model/i.test(raw)) {
    return `Mistral model not available. Try ${DEFAULT_MODEL} or another model from Agent settings. (${raw.slice(0, 160)})`;
  }

  const msg = raw.replace(/\s+/g, " ").trim().slice(0, 400);
  return msg || "Mistral request failed.";
}
