/**
 * Pure helpers for stream onFinish persistence (G0 / G-P1-1, G-P1-2).
 */

export type ToolResultLike = {
  toolName?: string;
  type?: string;
  output?: unknown;
};

export function shouldFenceArtifacts(opts: {
  mode: "build" | "plan";
  createArtifactEnabled: boolean;
  toolCreatedArtifact: boolean;
}): boolean {
  if (opts.mode !== "build") return false;
  if (!opts.createArtifactEnabled) return false;
  if (opts.toolCreatedArtifact) return false;
  return true;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

/** True when any tool result successfully created a canvas artifact. */
export function toolCreatedArtifact(results: ToolResultLike[]): boolean {
  for (const r of results) {
    if (r.toolName !== "create_artifact" && r.toolName !== "launch_site") continue;
    const out = asRecord(r.output);
    if (!out) continue;
    if (out.ok === true && (typeof out.artifactId === "string" || out.artifactId)) {
      return true;
    }
  }
  return false;
}

/** Collect toolResults from AI SDK steps (all steps, not only last). */
export function collectToolResultsFromSteps(
  steps: Array<{ toolResults?: readonly ToolResultLike[] } | undefined> | undefined,
): ToolResultLike[] {
  if (!steps?.length) return [];
  const out: ToolResultLike[] = [];
  for (const s of steps) {
    if (s?.toolResults?.length) out.push(...s.toolResults);
  }
  return out;
}

function formatOne(r: ToolResultLike): string | null {
  const name = r.toolName ?? "tool";
  const out = asRecord(r.output);
  if (!out) return null;

  if (out.ok === false && typeof out.error === "string") {
    return `${name} failed: ${out.error.slice(0, 200)}`;
  }

  switch (name) {
    case "create_artifact":
    case "launch_site": {
      if (out.ok === true) {
        const title = typeof out.title === "string" ? out.title : "Artifact";
        const id = typeof out.artifactId === "string" ? out.artifactId.slice(0, 8) : "";
        const n = typeof out.filesCount === "number" ? out.filesCount : null;
        const multi = r.toolName === "launch_site" || (n != null && n > 1);
        const label = multi ? "Created multi-page site" : "Created artifact";
        return id ? `${label} «${title}» (${id}…)` : `${label} «${title}»`;
      }
      return null;
    }
    case "edit_file": {
      if (out.ok === true) {
        const path = typeof out.path === "string" ? out.path : "file";
        return `Edited ${path}`;
      }
      return null;
    }
    case "remember": {
      if (out.ok === true && typeof out.key === "string") {
        return `Remembered key «${out.key}»`;
      }
      return null;
    }
    case "plan_steps": {
      if (out.ok === true) {
        const plan = asRecord(out.plan);
        const goal = plan && typeof plan.goal === "string" ? plan.goal : null;
        return goal ? `Plan: ${goal}` : "Structured plan ready";
      }
      return null;
    }
    case "read_artifact": {
      if (out.ok === true) return "Read artifact";
      return null;
    }
    case "fetch_url": {
      if (out.ok === true && typeof out.url === "string") {
        return `Fetched ${out.url}${out.truncated ? " (truncated)" : ""}`;
      }
      return null;
    }
    case "web_search": {
      if (out.ok === true && Array.isArray(out.hits)) {
        return `Web search: ${out.hits.length} hit(s)`;
      }
      return null;
    }
    default:
      if (out.ok === true) return `Ran ${name}`;
      return null;
  }
}

/** Human-readable multi-line summary for tool-only assistant rows (max ~2k). */
export function summarizeToolResults(results: ToolResultLike[]): string {
  const lines: string[] = [];
  for (const r of results) {
    const line = formatOne(r);
    if (line) lines.push(line);
  }
  const text = lines.join("\n").trim();
  return text.slice(0, 2000);
}
