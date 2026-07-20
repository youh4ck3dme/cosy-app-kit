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
- Do NOT invent extra pages (no team.html, blog.html, services.html) — only the four files above
- CTA labels may exist, but any link target must be one of those four hrefs (use contact.html for booking)
- sections: concrete copy bullets for that page (SK if brief is Slovak, else match brief language)
- Distinctive brand colors — avoid generic purple AI SaaS
- Pricing page must include realistic price points for the business
- Contact page: address/hours/phone placeholders if not in brief
- Max ~4k user brief; invent sensible gaps, never leave empty sections`;

export function buildBlueprintUserPrompt(brief: string): string {
  const clipped = brief.trim().slice(0, 4000);
  return `Business brief for a 4-page mini-site (Home / About / Contact / Pricing):\n\n${clipped}\n\nReturn JSON only.`;
}

/** CSS workers should keep (or re-include) so hamburger works on phones. */
export const PAGE_NAV_CSS_HINT = `/* required mobile-first nav — do not invert */
.site-nav-toggle{display:inline-flex;min-width:44px;min-height:44px}
.site-nav{display:none;flex-direction:column}
.site-nav.is-open{display:flex}
@media (min-width:768px){
  .site-nav-toggle{display:none}
  .site-nav{display:flex;flex-direction:row;position:static}
}`;

export function PAGE_SYSTEM(pageId: PageId): string {
  const path = PAGE_PATHS[pageId];
  return `You write ONE complete self-contained HTML5 document for page "${pageId}" (file ${path}).

Rules:
- Start with <!DOCTYPE html>
- Include <meta name="viewport" content="width=device-width, initial-scale=1"> ONLY — never user-scalable=no or maximum-scale=1
- Mobile-first CSS: base styles for ~360–430px phones, then @media (min-width: 768px)
- Hamburger: .site-nav-toggle VISIBLE by default; .site-nav hidden until .is-open; desktop (min-width 768) hide toggle, show row nav
- Include this nav CSS (or equivalent):
${PAGE_NAV_CSS_HINT}
- Use the EXACT header HTML and footer HTML snippets provided (paste as-is inside body) — they include data-nav-toggle script
- EVERY href to a page must be one of: index.html, about.html, contact.html, pricing.html — NEVER team.html, blog.html, or other missing files; booking CTAs → contact.html
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

Allowed page links only: index.html, about.html, contact.html, pricing.html.
Write the full HTML document now.`;
}
