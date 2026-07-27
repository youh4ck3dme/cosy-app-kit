import type { DisplayOverride } from "vite-plugin-pwa";

/**
 * Single source of truth for the PWA manifest. Consumed by vite-plugin-pwa's
 * `manifest` option (generates manifest.webmanifest at build time) and by
 * pwa-assets.test.ts. Do not hand-author a static public/manifest.webmanifest —
 * vite-plugin-pwa generates and serves its own, silently shadowing it.
 */
export const PWA_MANIFEST = {
  name: "COSY.AI — Visual Code Engine",
  short_name: "COSY.AI",
  description:
    "Enterprise visual web construction engine. Figma, screenshots & ideas → production React/Tailwind in milliseconds.",
  start_url: "/chat",
  id: "com.cosyapp.visualcodeengine",
  scope: "/",
  display: "standalone" as const,
  display_override: ["window-controls-overlay", "standalone", "minimal-ui"] as DisplayOverride[],
  orientation: "any" as const,
  background_color: "#0A0A0C",
  theme_color: "#0A0A0C",
  categories: ["developer", "productivity", "utilities"],
  launch_handler: {
    client_mode: "focus-existing" as const,
  },
  prefer_related_applications: false,
  icons: [
    {
      src: "/favicon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    {
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      src: "/icons/icon-512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
  screenshots: [
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      form_factor: "narrow" as const,
      label: "COSY.AI Mobile Builder Canvas",
    },
    {
      src: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      form_factor: "wide" as const,
      label: "COSY.AI Desktop Visual Workspace",
    },
  ],
  shortcuts: [
    {
      name: "New Chat",
      short_name: "Chat",
      description: "Start a new AI builder chat session",
      url: "/chat",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
    },
    {
      name: "App Templates",
      short_name: "Templates",
      description: "Browse production starter templates",
      url: "/templates",
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
    },
  ],
};
