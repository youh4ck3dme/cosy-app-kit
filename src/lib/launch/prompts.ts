import type { LaunchBlueprint, PageId } from "./schema";
import { PAGE_PATHS } from "./schema";

export const BLUEPRINT_SYSTEM = `You are a senior product designer writing a STRICT JSON blueprint for a 4-page mini marketing site.

Return ONLY valid JSON (no markdown fences, no commentary) matching this shape:
{
  "project": { "name": string, "tagline"?: string, "locale"?: "sk"|"en"|string },
  "brand": { "primary"?: cssColor, "accent"?: cssColor, "background"?: cssColor, "font"?: string },
  "nav": [ { "label": string, "href": "index.html"|"about.html"|"contact.html"|"pricing.html" } ],
  "pages": {
    "home": { "title", "headline"?, "sections": string[], "cta"? },
    "about": { "title", "headline"?, "sections": string[], "cta"? },
    "contact": { "title", "headline"?, "sections": string[], "cta"? },
    "pricing": { "title", "headline"?, "sections": string[], "cta"? }
  },
  "seo"?: { "description"?, "keywords"?: string[] },
  "faq"?: [ { "q", "a" } ],
  "compliance"?: string
}

Hard rules:
- nav href MUST be relative *.html only (index.html, about.html, contact.html, pricing.html) — never /about or https://
- sections: concrete copy bullets for that page (SK if brief is Slovak, else match brief language)
- Distinctive brand colors — avoid generic purple AI SaaS
- Pricing page must include realistic price points for the business
- Contact page: address/hours/phone placeholders if not in brief
- Max ~4k user brief; invent sensible gaps, never leave empty sections`;

export function buildBlueprintUserPrompt(brief: string): string {
  const clipped = brief.trim().slice(0, 4000);
  return `Business brief for a 4-page mini-site (Home / About / Contact / Pricing):\n\n${clipped}\n\nReturn JSON only.`;
}

export function PAGE_SYSTEM(pageId: PageId): string {
  const path = PAGE_PATHS[pageId];
  return `You write ONE complete self-contained HTML5 document for page "${pageId}" (file ${path}).

Rules:
- Start with <!DOCTYPE html>
- Include <meta name="viewport" content="width=device-width, initial-scale=1">
- Mobile-first CSS in <style>; single column under 768px; no horizontal scroll
- Use the EXACT header HTML and footer HTML snippets provided (paste as-is inside body)
- Nav links must stay as relative *.html (index.html, about.html, …) so canvas multi-page preview works
- No external frameworks unless CDN is essential; prefer inline CSS
- Semantic HTML; buttons need accessible labels
- Do NOT wrap the document in markdown fences
- Distinctive palette from brand tokens; no default purple-on-dark AI look`;
}

export function buildPageUserPrompt(
  pageId: PageId,
  blueprint: LaunchBlueprint,
  shell: { headerHtml: string; footerHtml: string; cssVars: string },
): string {
  const slice = blueprint.pages[pageId];
  const path = PAGE_PATHS[pageId];
  return `Project: ${blueprint.project.name}
Tagline: ${blueprint.project.tagline ?? ""}
Locale: ${blueprint.project.locale ?? "sk"}
Page id: ${pageId} → file ${path}
Page title: ${slice.title}
Headline: ${slice.headline ?? slice.title}
Sections (cover these):
${slice.sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}
CTA: ${slice.cta ?? ""}
Nav JSON: ${JSON.stringify(blueprint.nav)}
SEO: ${JSON.stringify(blueprint.seo ?? {})}
FAQ: ${JSON.stringify(blueprint.faq ?? [])}
Compliance: ${blueprint.compliance ?? ""}

CSS variables to put in :root (or reuse):
${shell.cssVars}

HEADER (paste inside <body> near top):
${shell.headerHtml}

FOOTER (paste before </body>):
${shell.footerHtml}

Write the full HTML document now.`;
}
