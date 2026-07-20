import { BUILD_CODE_MODEL } from "@/lib/models";
import type { GenerateTextFn } from "./blueprint";
import { PAGE_SYSTEM, buildPageUserPrompt } from "./prompts";
import { PAGE_PATHS, type LaunchBlueprint, type PageId } from "./schema";
import { placeholderPageHtml, type SharedShell } from "./shell";

function stripHtmlFences(raw: string): string {
  const t = raw.trim();
  const fenced = /^```(?:html)?\s*\n?([\s\S]*?)\n?```$/i.exec(t);
  if (fenced?.[1]) return fenced[1].trim();
  return t;
}

const DEFAULT_ALLOWED_HREFS = new Set(Object.values(PAGE_PATHS));

/**
 * Soft post-process: drop a11y-hostile viewport locks and rewrite unknown *.html
 * links to contact.html (common model hallucination: team.html).
 */
export function sanitizeGeneratedPageHtml(
  html: string,
  allowedHrefs: Iterable<string> = DEFAULT_ALLOWED_HREFS,
): string {
  const allowed = new Set(allowedHrefs);
  let out = html;
  out = out.replace(/\s*user-scalable\s*=\s*no/gi, "");
  out = out.replace(/\s*,?\s*maximum-scale\s*=\s*1(\.0)?/gi, "");
  out = out.replace(/href\s*=\s*(["'])([^"']+\.html(?:\?[^"']*)?)\1/gi, (full, q, href) => {
    const pathOnly = String(href).split("?")[0] ?? href;
    if (allowed.has(pathOnly)) return full;
    if (/^https?:\/\//i.test(pathOnly) || pathOnly.startsWith("//")) return full;
    return `href=${q}contact.html${q}`;
  });
  return out;
}

export function ensureHtmlDocument(raw: string): string {
  const html = stripHtmlFences(raw).trim();
  if (!html) throw new Error("Empty HTML from page worker");
  const lower = html.slice(0, 200).toLowerCase();
  if (!lower.includes("<!doctype") && !lower.includes("<html")) {
    throw new Error("Page worker output is not an HTML document");
  }
  return sanitizeGeneratedPageHtml(html);
}

export async function generatePage(
  pageId: PageId,
  blueprint: LaunchBlueprint,
  shell: SharedShell,
  opts: { generateText: GenerateTextFn },
): Promise<{ pageId: PageId; html: string; fallback: boolean }> {
  try {
    const text = await opts.generateText({
      modelId: BUILD_CODE_MODEL,
      system: PAGE_SYSTEM(pageId),
      prompt: buildPageUserPrompt(pageId, blueprint, shell),
      temperature: 0.6,
      maxOutputTokens: 3500,
    });
    const html = ensureHtmlDocument(text);
    return { pageId, html, fallback: false };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return {
      pageId,
      html: placeholderPageHtml(pageId, blueprint, shell, reason),
      fallback: true,
    };
  }
}

export async function generateAllPages(
  blueprint: LaunchBlueprint,
  shell: SharedShell,
  opts: { generateText: GenerateTextFn; pageIds?: PageId[] },
): Promise<Array<{ pageId: PageId; html: string; fallback: boolean }>> {
  const ids = opts.pageIds ?? (["home", "about", "contact", "pricing"] as PageId[]);
  return Promise.all(ids.map((id) => generatePage(id, blueprint, shell, opts)));
}
