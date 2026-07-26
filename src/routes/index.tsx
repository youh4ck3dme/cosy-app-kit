import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CommunityGallery } from "@/components/landing/CommunityGallery";

const listPublicArtifacts = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [] as Array<{ id: string; title: string; kind: string }>;
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb
    .from("artifacts")
    .select("id,title,kind")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) return [];
  return (data ?? []) as Array<{ id: string; title: string; kind: string }>;
});

export const Route = createFileRoute("/")({
  loader: () => listPublicArtifacts(),
  head: () => ({
    meta: [
      { title: "Builder — AI app studio" },
      {
        name: "description",
        content: "Chat, live canvas, and shareable artifacts — powered by Mistral.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const made = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-50" />
      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-10">
        <div className="font-mono text-sm font-semibold tracking-tight">&gt;_ Builder</div>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/templates" className="text-muted-foreground hover:text-foreground">
            Templates
          </Link>
          <Link
            to="/auth"
            search={{ next: "/chat", oauth_stage: "", lr: "", provider: "" }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative">
        <Hero />
        <HowItWorks />
        <FeatureGrid />
        <CommunityGallery made={made} />
      </main>

      <footer className="relative z-10 border-t border-border-subtle px-4 py-8 sm:px-10">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="font-mono text-xs text-muted-foreground">&gt;_ Builder</div>
          <nav className="flex items-center gap-4 text-muted-foreground">
            <Link to="/templates" className="hover:text-foreground">
              Templates
            </Link>
            <Link
              to="/auth"
              search={{ next: "/chat", oauth_stage: "", lr: "", provider: "" }}
              className="hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
