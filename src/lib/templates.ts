import {
  BarChart3,
  CreditCard,
  Gamepad2,
  LayoutTemplate,
  User,
  type LucideIcon,
} from "lucide-react";

export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  prompt: string;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "landing",
    title: "Landing page",
    description: "Hero, features, CTA — ready to ship.",
    icon: LayoutTemplate,
    prompt:
      "Build a polished single-file HTML landing page for a fictional AI note-taking app called Lumen. Dark theme, bold hero with gradient headline, three feature cards, social proof strip, and a final CTA. Modern CSS only, no frameworks.",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Stats, charts, activity feed.",
    icon: BarChart3,
    prompt:
      "Build a single-file HTML analytics dashboard mock: sidebar nav, four stat tiles with deltas, a line chart and a bar chart drawn with inline SVG, and a recent-activity table. Dark theme, clean spacing, no external libraries.",
  },
  {
    id: "pricing",
    title: "Pricing page",
    description: "Three tiers with a highlighted plan.",
    icon: CreditCard,
    prompt:
      "Build a single-file HTML pricing page with three tiers (Starter, Pro highlighted, Enterprise), a monthly/annual toggle that updates prices with vanilla JS, a feature comparison list, and an FAQ accordion. Dark theme.",
  },
  {
    id: "game",
    title: "Mini game",
    description: "Something playable in the canvas.",
    icon: Gamepad2,
    prompt:
      "Build a playable single-file HTML game: a simple neon breakout clone on <canvas> with keyboard and touch controls, score, lives, and a restart screen. Vanilla JS only.",
  },
  {
    id: "portfolio",
    title: "Portfolio",
    description: "Personal site with projects grid.",
    icon: User,
    prompt:
      "Build a single-file HTML personal portfolio for a fictional product designer: intro section, selected projects grid with hover effects, about section, and contact footer. Elegant dark theme with one accent color.",
  },
];
