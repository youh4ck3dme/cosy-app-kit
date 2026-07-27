// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
//
// Vite 8 natively supports tsconfig paths via resolve.tsconfigPaths. Lovable's wrapper still
// injects vite-tsconfig-paths (peer), which triggers a warnOnce. We strip that plugin after
// the Lovable config resolves and enable the native option instead.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import type { ConfigEnv, PluginOption, UserConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { PWA_MANIFEST } from "./src/lib/pwa-manifest";

function isTsconfigPathsPlugin(p: PluginOption): boolean {
  return (
    typeof p === "object" &&
    p !== null &&
    !Array.isArray(p) &&
    "name" in p &&
    (p.name === "vite-tsconfig-paths" || p.name === "vite-plugin-tsconfig-paths")
  );
}

function stripTsconfigPathsPlugins(plugins: PluginOption[] | undefined): PluginOption[] {
  return (plugins ?? []).flatMap((p) => {
    if (!p) return [];
    if (Array.isArray(p)) return stripTsconfigPathsPlugins(p);
    if (isTsconfigPathsPlugin(p)) return [];
    return [p];
  });
}

const lovableConfig = defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      mcpPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: PWA_MANIFEST,
      }),
    ],
    resolve: {
      tsconfigPaths: true,
      dedupe: ["react", "react-dom"],
    },
    // Expose SUPABASE_* as well as VITE_* so Lovable Cloud secrets without VITE_ prefix work.
    envPrefix: ["VITE_", "SUPABASE_"],
    server: {
      // Lovable Cloud Redirect URLs allowlist uses 127.0.0.1 (not localhost).
      // Bind explicitly so Vite prints http://127.0.0.1:8080 and OAuth lr matches.
      host: "127.0.0.1",
      port: 8080,
      strictPort: true, // never silently fall over to :8081 (breaks OAuth allowlist)
      watch: {
        // Debug NDJSON ingest must not trigger Vite HMR (render↔log feedback loop).
        ignored: ["**/.cursor/**"],
      },
      // Optional: if something still hits relative /~oauth/* on local loopback,
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

export default async (env: ConfigEnv): Promise<UserConfig> => {
  const cfg = await lovableConfig(env);
  return {
    ...cfg,
    resolve: {
      ...cfg.resolve,
      tsconfigPaths: true,
      dedupe: [...new Set([...(cfg.resolve?.dedupe ?? []), "react", "react-dom"])],
    },
    // Force after Lovable wrapper merge (sandbox detection may rewrite host).
    server: {
      ...cfg.server,
      host: "127.0.0.1",
      port: 8080,
      strictPort: true,
    },
    plugins: stripTsconfigPathsPlugins(cfg.plugins as PluginOption[] | undefined),
  };
};
