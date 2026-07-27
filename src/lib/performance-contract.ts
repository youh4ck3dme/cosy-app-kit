/**
 * Performance Contract v0.1 — product Builder (chat + canvas).
 *
 * Budgets are engineering targets for time-to-first-artifact, not formal SLAs.
 * Marketplace / CRDT / Design Canvas hosts are OUT OF SCOPE for this contract.
 */

export const PERFORMANCE_CONTRACT_VERSION = "0.1" as const;

/** Explicitly forbidden work while this contract is the active ship focus. */
export const PERF_CONTRACT_OUT_OF_SCOPE = [
  "marketplace",
  "crdt-multiplayer",
  "design-canvas-host",
] as const;

/**
 * Field / CI budgets (targets). Measure via Lighthouse / PerformanceObserver /
 * iframe onLoad marks — not yet wired as hard CI gates except unit invariants.
 */
export const PERF_BUDGETS = {
  /** Largest Contentful Paint on /chat shell (warm cache, mid-tier laptop). */
  lcpMs: 2500,
  /** Interaction to Next Paint for composer send / view toggle. */
  inpMs: 200,
  /** Time from artifact HTML available → preview iframe onLoad. */
  artifactFirstPaintMs: 800,
  /** Server time to first stream byte for /api/chat (auth + trim + model start). */
  chatTtfbMs: 1500,
  /** Max UI messages forwarded to the model after trim. */
  maxContextMessages: 24,
  /** Soft cap per text part before model convert (keeps TTFB down). */
  maxTextPartChars: 12_000,
  /** Soft cap across all trimmed message text parts. */
  maxTotalContextChars: 96_000,
} as const;

export type UiMessageLike = {
  id?: string;
  role?: string;
  parts?: Array<{ type: string; text?: string; [k: string]: unknown }>;
};

/**
 * Count-trim then char-clip message parts so long fenced HTML / tool dumps
 * cannot dominate model context (stream-safe truncate policy).
 *
 * Keeps message count + roles; only shortens `type: "text"` part strings.
 * Last user message is clipped last (prefer older history shrink first).
 */
export function trimMessagesForModel<T extends UiMessageLike>(
  messages: T[],
  opts?: {
    maxMessages?: number;
    maxTextPartChars?: number;
    maxTotalContextChars?: number;
  },
): T[] {
  const maxMessages = opts?.maxMessages ?? PERF_BUDGETS.maxContextMessages;
  const maxPart = opts?.maxTextPartChars ?? PERF_BUDGETS.maxTextPartChars;
  const maxTotal = opts?.maxTotalContextChars ?? PERF_BUDGETS.maxTotalContextChars;

  const windowed =
    messages.length <= maxMessages ? messages.slice() : messages.slice(-maxMessages);

  const clipped = windowed.map((m) => {
    if (!m.parts?.length) return m;
    const parts = m.parts.map((p) => {
      if (p.type !== "text" || typeof p.text !== "string") return p;
      if (p.text.length <= maxPart) return p;
      return {
        ...p,
        text: `${p.text.slice(0, maxPart)}\n/* …truncated for model context… */`,
      };
    });
    return { ...m, parts };
  });

  let total = 0;
  for (const m of clipped) {
    for (const p of m.parts ?? []) {
      if (p.type === "text" && typeof p.text === "string") total += p.text.length;
    }
  }
  if (total <= maxTotal) return clipped;

  // Shrink oldest text parts first; protect the trailing user turn when possible.
  const lastUserIdx = (() => {
    for (let i = clipped.length - 1; i >= 0; i--) {
      if (clipped[i]?.role === "user") return i;
    }
    return -1;
  })();

  let over = total - maxTotal;
  for (let i = 0; i < clipped.length && over > 0; i++) {
    if (i === lastUserIdx) continue;
    const m = clipped[i];
    if (!m?.parts) continue;
    const parts = m.parts.map((p) => {
      if (over <= 0 || p.type !== "text" || typeof p.text !== "string") return p;
      const room = Math.max(512, p.text.length - over);
      if (room >= p.text.length) return p;
      const next = `${p.text.slice(0, room)}\n/* …truncated for model context… */`;
      over -= p.text.length - next.length;
      return { ...p, text: next };
    });
    clipped[i] = { ...m, parts };
  }

  if (over > 0 && lastUserIdx >= 0) {
    const m = clipped[lastUserIdx];
    if (m?.parts) {
      const parts = m.parts.map((p) => {
        if (over <= 0 || p.type !== "text" || typeof p.text !== "string") return p;
        const room = Math.max(1_500, p.text.length - over);
        if (room >= p.text.length) return p;
        const next = `${p.text.slice(0, room)}\n/* …truncated for model context… */`;
        over -= p.text.length - next.length;
        return { ...p, text: next };
      });
      clipped[lastUserIdx] = { ...m, parts };
    }
  }

  return clipped;
}

/** Preview CSP must stay offline-safe (no bare script CDN hosts). */
export function previewCspAllowsBareScriptCdn(csp: string): boolean {
  return /script-src[^;]*(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)/i.test(csp);
}

/** Schedule non-critical work after first paint / idle. */
export function scheduleIdle(task: () => void): () => void {
  if (typeof window === "undefined") {
    task();
    return () => undefined;
  }
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(task, { timeout: 2500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(task, 1);
  return () => window.clearTimeout(t);
}
