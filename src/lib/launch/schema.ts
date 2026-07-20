import { z } from "zod";

/** Relative page href only — no absolute paths, no parent traversal. */
export const RelativeHtmlHrefSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.html$/, "href must be a relative *.html path")
  .refine((h) => !h.includes("..") && !h.startsWith("/"), "href must not be absolute or traverse");

export const NavItemSchema = z.object({
  label: z.string().min(1).max(40),
  href: RelativeHtmlHrefSchema,
});

export const PageSliceSchema = z.object({
  title: z.string().min(1).max(80),
  headline: z.string().min(1).max(160).optional(),
  sections: z.array(z.string().min(1).max(400)).min(1).max(12),
  cta: z.string().min(1).max(80).optional(),
});

export const LaunchBlueprintSchema = z.object({
  project: z.object({
    name: z.string().min(1).max(80),
    tagline: z.string().min(1).max(160).optional(),
    locale: z.string().min(2).max(16).optional().default("sk"),
  }),
  brand: z.object({
    primary: z.string().min(3).max(40).optional().default("#1a1a1a"),
    accent: z.string().min(3).max(40).optional().default("#c45c26"),
    background: z.string().min(3).max(40).optional().default("#faf8f5"),
    font: z.string().min(1).max(80).optional().default("Georgia, 'Times New Roman', serif"),
  }),
  nav: z.array(NavItemSchema).min(2).max(8),
  pages: z.object({
    home: PageSliceSchema,
    about: PageSliceSchema,
    contact: PageSliceSchema,
    pricing: PageSliceSchema,
  }),
  seo: z
    .object({
      description: z.string().min(1).max(300).optional(),
      keywords: z.array(z.string().max(40)).max(12).optional(),
    })
    .optional(),
  faq: z
    .array(
      z.object({
        q: z.string().min(1).max(200),
        a: z.string().min(1).max(600),
      }),
    )
    .max(8)
    .optional(),
  compliance: z.string().min(1).max(400).optional(),
  _meta: z.record(z.string(), z.unknown()).optional(),
});

export type LaunchBlueprint = z.infer<typeof LaunchBlueprintSchema>;
export type PageId = keyof LaunchBlueprint["pages"];

export const PAGE_IDS: PageId[] = ["home", "about", "contact", "pricing"];

export const PAGE_PATHS: Record<PageId, string> = {
  home: "index.html",
  about: "about.html",
  contact: "contact.html",
  pricing: "pricing.html",
};

/** Ensure default nav covers the four standard pages when model omits some. */
export function normalizeBlueprintNav(bp: LaunchBlueprint): LaunchBlueprint {
  const byHref = new Map(bp.nav.map((n) => [n.href, n]));
  const defaults: Array<{ label: string; href: string }> = [
    { label: "Domov", href: "index.html" },
    { label: "O nás", href: "about.html" },
    { label: "Kontakt", href: "contact.html" },
    { label: "Cenník", href: "pricing.html" },
  ];
  const nav = defaults.map((d) => byHref.get(d.href) ?? d);
  // Keep any extra relative pages after the four standards
  for (const item of bp.nav) {
    if (!nav.some((n) => n.href === item.href)) nav.push(item);
  }
  return { ...bp, nav: nav.slice(0, 8) };
}
