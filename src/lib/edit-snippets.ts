import type { UIMessage } from "ai";

/** Latest successful `edit_file` tool snippets for Canvas Diff ("Show model change"). */
export type EditFileSnippet = {
  artifactId?: string;
  path: string;
  beforeSnippet: string;
  afterSnippet: string;
};

function toolNameOf(part: { type?: string; toolName?: string }): string {
  if (part.type === "dynamic-tool" && typeof part.toolName === "string") return part.toolName;
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return "";
}

/**
 * Walk chat messages newest-last; return snippets in chronological order.
 * Canvas picks the latest match for the active artifact/path.
 */
export function extractEditFileSnippets(messages: UIMessage[]): EditFileSnippet[] {
  const out: EditFileSnippet[] = [];
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (typeof part !== "object" || part === null) continue;
      const p = part as {
        type?: string;
        toolName?: string;
        state?: string;
        output?: unknown;
      };
      if (toolNameOf(p) !== "edit_file") continue;
      if (p.state !== "output-available") continue;
      if (!p.output || typeof p.output !== "object") continue;
      const o = p.output as Record<string, unknown>;
      if (o.ok !== true) continue;
      if (typeof o.path !== "string") continue;
      if (typeof o.beforeSnippet !== "string" || typeof o.afterSnippet !== "string") continue;
      out.push({
        artifactId: typeof o.artifactId === "string" ? o.artifactId : undefined,
        path: o.path,
        beforeSnippet: o.beforeSnippet,
        afterSnippet: o.afterSnippet,
      });
    }
  }
  return out;
}

export function latestSnippetForFile(
  snippets: EditFileSnippet[],
  path: string,
  artifactId?: string,
): EditFileSnippet | null {
  for (let i = snippets.length - 1; i >= 0; i--) {
    const s = snippets[i]!;
    if (s.path !== path) continue;
    if (artifactId && s.artifactId && s.artifactId !== artifactId) continue;
    return s;
  }
  return null;
}
