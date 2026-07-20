/** Static template gallery seed (Cursor phase J) — no Supabase migration required. */

export type TemplateSeed = {
  slug: string;
  title: string;
  category: string;
  blurb: string;
  prompt: string;
};

export const TEMPLATE_CATEGORIES = [
  "Marketing",
  "App UI",
  "Docs",
  "Dashboards",
  "Landing",
] as const;

export const TEMPLATES: TemplateSeed[] = [
  {
    slug: "saas-landing",
    title: "SaaS landing",
    category: "Landing",
    blurb: "Hero, features, pricing teaser — distinctive, not purple.",
    prompt:
      "Build a distinctive self-contained HTML landing page for a B2B analytics SaaS called Northline. Hero, 3 features, pricing teaser, footer. Not purple. Mobile hamburger. Chart.js sparkline optional.",
  },
  {
    slug: "ops-dashboard",
    title: "Ops dashboard",
    category: "Dashboards",
    blurb: "Dark ops UI with KPIs and a Chart.js revenue line.",
    prompt:
      "Build a dark ops dashboard HTML with sidebar, KPI cards, Chart.js revenue line chart with Week/Month/Year data switching, recent activity list. Responsive @media. Distinctive palette (not indigo/purple).",
  },
  {
    slug: "todo-app",
    title: "Todo app",
    category: "App UI",
    blurb: "LocalStorage todo with filters and calm earth tones.",
    prompt:
      "Build a polished single-file HTML todo app: add/complete/delete, localStorage persistence, filters All/Active/Done, keyboard Enter to add, accessible labels, calm earth-tone palette.",
  },
  {
    slug: "readme-cli",
    title: "CLI README",
    category: "Docs",
    blurb: "Professional markdown README for an open-source CLI.",
    prompt:
      "Write a professional markdown README for an open-source CLI called `forge` (Rust). Include install, usage, config, and contributing. Emit a ```markdown fence.",
  },
  {
    slug: "pricing-page",
    title: "Pricing page",
    category: "Marketing",
    blurb: "Three tiers, FAQ, and a strong CTA.",
    prompt:
      "Build a self-contained HTML pricing page with 3 tiers (Free/Pro/Team), feature comparison, FAQ accordion, and a sticky CTA. Distinctive palette — avoid purple gradients. Fully responsive.",
  },
  {
    slug: "portfolio",
    title: "Portfolio",
    category: "Landing",
    blurb: "Personal portfolio with project grid and contact.",
    prompt:
      "Build a personal portfolio HTML page: name hero, 6 project cards with hover, about section, contact form (UI only). Serif display + mono accents. Mobile-first.",
  },
  {
    slug: "waitlist",
    title: "Waitlist",
    category: "Marketing",
    blurb: "Minimal waitlist with email capture UI.",
    prompt:
      "Build a minimal waitlist landing HTML: full-bleed atmospheric background, product name, one sentence, email + join button (client-side validation only), social proof row. No purple.",
  },
  {
    slug: "kanban",
    title: "Kanban board",
    category: "App UI",
    blurb: "Three-column kanban with localStorage.",
    prompt:
      "Build a single-file HTML kanban board with columns Todo/Doing/Done, drag cards between columns, add/delete cards, persist to localStorage. Accessible labels. Calm slate palette.",
  },
  {
    slug: "docs-site",
    title: "Docs shell",
    category: "Docs",
    blurb: "Docs layout with sidebar nav and prose.",
    prompt:
      "Build a docs site shell in HTML: left sidebar nav, main prose area with headings and code sample, search input (UI only). Dark theme, JetBrains Mono for code.",
  },
  {
    slug: "analytics-cards",
    title: "Analytics cards",
    category: "Dashboards",
    blurb: "Metric cards + sparkline strip.",
    prompt:
      "Build an analytics overview HTML: 4 metric cards, a Chart.js area sparkline, and a table of top pages. Responsive grid. Avoid indigo/purple AI defaults.",
  },
];

export function getTemplateBySlug(slug: string): TemplateSeed | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

export const TEMPLATE_PROMPT_STORAGE_KEY = "builder:template-prompt";
export const TOUR_DONE_STORAGE_KEY = "builder:tour-done";
