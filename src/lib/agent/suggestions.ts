/**
 * Pure helpers for follow-up suggestion chips (Grok G3 / Cursor E).
 * Server fn uses these after Mistral Small returns lines.
 */

import { STARTERS } from "@/lib/starters";

/** Max chips shown under last assistant message. */
export const MAX_SUGGESTIONS = 3;

/**
 * Parse model output into short follow-up prompts.
 * Accepts numbered lists, bullets, or plain lines.
 */
export function parseSuggestionLines(raw: string, max = MAX_SUGGESTIONS): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*[-*•]\s+/, "")
        .replace(/^\s*\d+[.)]\s+/, "")
        .replace(/^["'`]|["'`]$/g, "")
        .trim(),
    )
    .filter((l) => l.length >= 4 && l.length <= 120)
    .filter((l) => !/^(here|sure|suggestions?|follow-?ups?):?\s*$/i.test(l));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(l);
    if (out.length >= max) break;
  }
  return out;
}

/** Static fallback when API missing or fails (Cursor can use immediately). */
export function staticSuggestionFallback(max = MAX_SUGGESTIONS): string[] {
  return STARTERS.slice(0, max).map((s) => s.prompt.slice(0, 120));
}

export function buildSuggestSystemPrompt(): string {
  return `You generate short follow-up prompts for a code/design builder chat.
Return exactly ${MAX_SUGGESTIONS} lines, each a user-style prompt max 12 words.
No numbering labels if possible; plain lines OK. No quotes. No preamble. English.`;
}

export function buildSuggestUserPrompt(lastAssistantText: string): string {
  const clip = lastAssistantText.trim().slice(0, 2500);
  return `Last assistant message:\n---\n${clip || "(empty)"}\n---\nSuggest ${MAX_SUGGESTIONS} useful next user prompts.`;
}
