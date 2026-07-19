// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    // Expose SUPABASE_* as well as VITE_* so Lovable Cloud secrets without VITE_ prefix work.
    envPrefix: ["VITE_", "SUPABASE_"],
    server: {
      // Optional: if something still hits relative /~oauth/* on localhost,
      // proxy to the published app (Google OAuth client lives there).
      proxy: {
        "/~oauth": {
          target: "https://cosy-app-kit.lovable.app",
          changeOrigin: true,
          secure: true,
        },
      },
    },
  },
});
