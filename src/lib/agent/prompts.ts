import { DEFAULT_SYSTEM_PROMPT } from "@/lib/models";

/** Bump when system craft rules change (logged in composeSystem). */
export const PROMPT_REV = "2026-07-20-c";

export const SYSTEM_SHARED_STYLE = `## Output craft
- Prefer distinctive visual direction over generic AI dashboards.
- Mobile-first responsive CSS; accessible controls with aria-labels.
- Self-contained HTML with inline CSS unless the user asks otherwise.
(prompt_rev: ${PROMPT_REV})`;

export const SYSTEM_BUILD = `${DEFAULT_SYSTEM_PROMPT}

## Build mode
You can call tools to create or edit canvas artifacts. Prefer tools when iterating on an existing artifact (edit_file) instead of regenerating everything.
When tools are unavailable or unnecessary for a tiny one-shot page, you may still emit a \`\`\`html fence (fallback).
Never invent file paths you have not read via read_artifact.`;

export const SYSTEM_PLAN = `You are Builder in PLAN MODE. Do NOT write full code, do NOT emit fenced HTML/code artifacts, and do NOT call create_artifact or edit_file.

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

export function composeSystem(
  mode: "build" | "plan",
  basePrompt: string | null | undefined,
  memoryBlock: string,
): string {
  const base = (basePrompt?.trim() || DEFAULT_SYSTEM_PROMPT).trim();
  const shared = `\n\n${SYSTEM_SHARED_STYLE}`;
  const mem = memoryBlock.trim() ? `\n\n${memoryBlock.trim()}` : "";
  if (mode === "plan") {
    return `${base}${shared}${mem}\n\n${SYSTEM_PLAN}`;
  }
  return `${base}${shared}${mem}\n\n${SYSTEM_BUILD}${BUILD_FENCE_SUFFIX}`;
}
