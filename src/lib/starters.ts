/** Official starter prompts (M5 growth-lite — not a full template gallery). */

export type Starter = {
  id: string;
  title: string;
  category: string;
  prompt: string;
};

export const STARTERS: Starter[] = [
  {
    id: "landing-saas",
    title: "SaaS landing",
    category: "Marketing",
    prompt:
      "Build a distinctive self-contained HTML landing page for a B2B analytics SaaS called Northline. Hero, 3 features, pricing teaser, footer. Not purple. Mobile hamburger. Optional sparkline via inline SVG or Canvas 2D (no CDN).",
  },
  {
    id: "dashboard-ops",
    title: "Ops dashboard",
    category: "App UI",
    prompt:
      "Build a dark ops dashboard HTML with sidebar, KPI cards, revenue line chart (Canvas 2D or SVG, or Chart.js vendored as a local file — no CDN) with Week/Month/Year data switching, recent activity list. Responsive @media. Distinctive palette (not indigo/purple).",
  },
  {
    id: "todo-app",
    title: "Todo app",
    category: "App UI",
    prompt:
      "Build a polished single-file HTML todo app: add/complete/delete, localStorage persistence, filters All/Active/Done, keyboard Enter to add, accessible labels, calm earth-tone palette.",
  },
  {
    id: "readme-md",
    title: "README writer",
    category: "Docs",
    prompt:
      "Write a professional markdown README for an open-source CLI called `forge` (Rust). Include install, usage, config, and contributing. Emit a ```markdown fence.",
  },
];

export function starterPromptsForEmptyState(): string[] {
  return STARTERS.map((s) => s.prompt);
}
