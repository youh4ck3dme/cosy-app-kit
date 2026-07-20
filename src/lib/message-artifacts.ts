/** Complete html/markdown fences — body is rendered on canvas, not in chat Streamdown. */
export const ARTIFACT_RE = /```(?:html|markdown|md)(?:\s+[^\n`]*)?\s*\n[\s\S]*?```/gi;
export const MULTI_FILE_RE = /```[^\n`]*\bpath=[^\n`]*\n[\s\S]*?```/gi;
/** Open fence without a closing ``` — must not go through Streamdown (freezes on large HTML). */
export const INCOMPLETE_ARTIFACT_FENCE_RE =
  /```(html|markdown|md)(?:[^\n`]*)?\r?\n([\s\S]*)$/i;
const SPLIT_MARK = "\u0000ARTIFACT\u0000";

export function splitAroundArtifacts(text: string): string[] {
  const multi = new RegExp(MULTI_FILE_RE.source, MULTI_FILE_RE.flags);
  const artifact = new RegExp(ARTIFACT_RE.source, ARTIFACT_RE.flags);
  return text.replace(multi, SPLIT_MARK).replace(artifact, SPLIT_MARK).split(SPLIT_MARK);
}

export function countCompleteFences(text: string): number {
  const multi = new RegExp(MULTI_FILE_RE.source, MULTI_FILE_RE.flags);
  const artifact = new RegExp(ARTIFACT_RE.source, ARTIFACT_RE.flags);
  return (text.match(multi)?.length ?? 0) + (text.match(artifact)?.length ?? 0);
}

/** Split prose from complete fences; strip incomplete open fences for safe streaming display. */
export function partitionAssistantText(text: string): {
  chunks: string[];
  completeFenceCount: number;
  incomplete: { lang: string; chars: number; lines: number } | null;
} {
  const completeFenceCount = countCompleteFences(text);
  const chunks = splitAroundArtifacts(text);
  if (chunks.length === 0) {
    return { chunks: [""], completeFenceCount, incomplete: null };
  }

  const lastIdx = chunks.length - 1;
  const last = chunks[lastIdx] ?? "";
  const open = INCOMPLETE_ARTIFACT_FENCE_RE.exec(last);
  if (!open) {
    return { chunks, completeFenceCount, incomplete: null };
  }

  const lang = (open[1] ?? "html").toLowerCase();
  const body = open[2] ?? "";
  const before = last.slice(0, open.index);
  const nextChunks = [...chunks];
  nextChunks[lastIdx] = before;

  return {
    chunks: nextChunks,
    completeFenceCount,
    incomplete: {
      lang,
      chars: body.length,
      lines: body.length === 0 ? 0 : body.split("\n").length,
    },
  };
}

export function formatBuildProgress(chars: number, lines: number): string {
  if (chars >= 1000) {
    return `${(chars / 1000).toFixed(1)}k chars · ${lines} lines`;
  }
  return `${chars} chars · ${lines} lines`;
}
