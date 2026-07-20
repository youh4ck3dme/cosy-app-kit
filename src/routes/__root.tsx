import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { registerServiceWorker } from "../lib/register-sw";
import { THEME_BOOTSTRAP_SCRIPT, useTheme } from "../lib/theme";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Builder — AI-first app studio" },
      {
        name: "description",
        content:
          "Builder is a dark, focused AI studio. Chat with your agent, watch it ship live artifacts to a real preview canvas.",
      },
      { name: "author", content: "Builder" },
      { property: "og:title", content: "Builder — AI-first app studio" },
      {
        property: "og:description",
        content:
          "Builder is a dark, focused AI studio. Chat with your agent, watch it ship live artifacts to a real preview canvas.",
      },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#0e0f14" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Builder — AI-first app studio" },
      {
        name: "twitter:description",
        content:
          "Builder is a dark, focused AI studio. Chat with your agent, watch it ship live artifacts to a real preview canvas.",
      },
    ],
    scripts: [
      // Theme class before first paint (avoids light/dark flash). Claude S10.
      { children: THEME_BOOTSTRAP_SCRIPT },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Theme class on <html> is set by THEME_BOOTSTRAP_SCRIPT before React hydrates
  // (and later by useTheme). SSR cannot know light/dark — suppress mismatch noise.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const { resolved } = useTheme();

  // PWA: prod-only service worker (ported from Claude PR #3 — never caches /api or Supabase)
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer past current React commit so router.invalidate does not hit
        // Transitioner setState before mount (React 19 DEV warning).
        window.setTimeout(() => {
          void router.invalidate();
          if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme={resolved} position="top-center" richColors />
    </QueryClientProvider>
  );
}
