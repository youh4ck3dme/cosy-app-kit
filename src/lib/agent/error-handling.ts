/**
 * Central helpers for Mistral / chat API error UX.
 * Server still formats via formatAiGatewayError; client uses these for banners.
 */

export type ChatErrorKind = "rate_limit" | "credits" | "auth" | "unavailable" | "offline" | "generic";

export function classifyChatError(message: string): ChatErrorKind {
  const m = message.toLowerCase();
  if (/429|rate limit|too many requests/.test(m)) return "rate_limit";
  if (/402|credits|quota|billing|payment required/.test(m)) return "credits";
  if (/401|403|unauthorized|invalid.?api.?key|mistral auth/.test(m)) return "auth";
  if (/5\d\d|unavailable|overloaded|timeout/.test(m)) return "unavailable";
  if (/failed to fetch|network|offline/.test(m)) return "offline";
  return "generic";
}

export function parseRetryAfterSeconds(message: string): number | null {
  const m = message.match(/retry[- ]after[:\s]+(\d+)/i) || message.match(/in\s+(\d+)\s*s/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 120) : null;
}

export function userFacingChatError(message: string): string {
  const kind = classifyChatError(message);
  switch (kind) {
    case "rate_limit": {
      const s = parseRetryAfterSeconds(message);
      return s
        ? `Too many requests. Retry in ${s}s.`
        : "Too many requests. Wait a moment and retry.";
    }
    case "credits":
      return "Mistral credits exhausted. Check billing at console.mistral.ai.";
    case "auth":
      return "Mistral auth failed. Check MISTRAL_API_KEY in server secrets.";
    case "unavailable":
      return "AI service unavailable. Retrying may help.";
    case "offline":
      return "You appear offline. Reconnect and try again.";
    default:
      return message.trim().slice(0, 400) || "Something went wrong.";
  }
}

/** Exponential backoff delays in ms for 5xx (max 3 attempts). */
export function backoffDelaysMs(): number[] {
  return [800, 1600, 3200];
}
