/**
 * Web helpers for agent tools (G1).
 * - fetch_url: HTML → text, size-capped, SSRF-guarded
 * - web_search: optional via SEARCH_API_KEY (Tavily-compatible); otherwise disabled
 */

const FETCH_TIMEOUT_MS = 8_000;
const MAX_TEXT_CHARS = 8_000;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateIp(hostname: string): boolean {
  // IPv4 private / link-local / loopback
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (/^127\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  // IPv6 local
  if (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80")) {
    return true;
  }
  return false;
}

export function assertSafeUrl(raw: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http/https URLs are allowed" };
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, error: "Host is blocked (SSRF guard)" };
  }
  if (isPrivateIp(host)) {
    return { ok: false, error: "Private IP ranges are blocked (SSRF guard)" };
  }
  return { ok: true, url };
}

/** Strip tags/scripts crudely for model context. */
export function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export async function fetchUrlText(
  rawUrl: string,
  opts?: { maxChars?: number; timeoutMs?: number; fetchImpl?: typeof fetch },
): Promise<
  | { ok: true; url: string; title?: string; text: string; truncated: boolean }
  | { ok: false; error: string }
> {
  const safe = assertSafeUrl(rawUrl);
  if (!safe.ok) return safe;
  const maxChars = opts?.maxChars ?? MAX_TEXT_CHARS;
  const timeoutMs = opts?.timeoutMs ?? FETCH_TIMEOUT_MS;
  const fetchImpl = opts?.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(safe.url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5",
        "User-Agent": "BuilderBot/1.0 (+https://builder.local)",
      },
    });
    // Re-check final URL after redirects
    const finalSafe = assertSafeUrl(res.url || safe.url.toString());
    if (!finalSafe.ok) return finalSafe;
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const raw = await res.text();
    let text: string;
    let title: string | undefined;
    if (ctype.includes("html") || /<html/i.test(raw.slice(0, 500))) {
      const t = raw.match(/<title[^>]*>([^<]*)<\/title>/i);
      title = t?.[1]?.trim();
      text = htmlToText(raw);
    } else {
      text = raw.replace(/\s+/g, " ").trim();
    }
    const truncated = text.length > maxChars;
    return {
      ok: true,
      url: finalSafe.url.toString(),
      title,
      text: text.slice(0, maxChars),
      truncated,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    if (msg.toLowerCase().includes("abort")) {
      return { ok: false, error: `Timeout after ${timeoutMs}ms` };
    }
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export type WebSearchHit = { title: string; url: string; snippet: string };

/**
 * Tavily-compatible search when SEARCH_API_KEY is set.
 * Without key → disabled (no Lovable gateway).
 */
export async function webSearch(
  query: string,
  opts?: { maxResults?: number; fetchImpl?: typeof fetch },
): Promise<
  | { ok: true; hits: WebSearchHit[]; provider: string }
  | { ok: false; error: string; disabled?: boolean }
> {
  const key = (process.env.SEARCH_API_KEY ?? process.env.TAVILY_API_KEY ?? "").trim();
  if (!key) {
    return {
      ok: false,
      disabled: true,
      error: "web_search disabled: set SEARCH_API_KEY (Tavily) in server secrets",
    };
  }
  const maxResults = Math.min(opts?.maxResults ?? 5, 8);
  const fetchImpl = opts?.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: query.slice(0, 400),
        max_results: maxResults,
        include_answer: false,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `Search API HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };
    const hits: WebSearchHit[] = (json.results ?? [])
      .filter((r) => r.url)
      .slice(0, maxResults)
      .map((r) => ({
        title: (r.title || r.url || "").slice(0, 200),
        url: r.url!,
        snippet: (r.content || "").slice(0, 400),
      }));
    return { ok: true, hits, provider: "tavily" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "search failed" };
  }
}
