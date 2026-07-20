import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

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
            search={{ next: "/chat" }}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:px-10">
        <h1 className="font-mono text-4xl font-bold tracking-tighter sm:text-6xl">
          <span className="text-gradient-accent">&gt;_ Build</span>
          <br />
          anything.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm text-muted-foreground sm:text-base">
          Chat with Mistral, ship HTML on a live canvas, and share public artifacts.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/chat"
            className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold leading-11 text-primary-foreground"
          >
            Open Builder
          </Link>
          <Link
            to="/templates"
            className="min-h-11 rounded-full border border-border-subtle px-5 text-sm leading-11 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            Browse templates
          </Link>
        </div>

        {made.length > 0 && (
          <section className="mt-20 text-left" aria-labelledby="made-heading">
            <h2 id="made-heading" className="text-center text-lg font-semibold">
              Made with Builder
            </h2>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Public artifacts from the community canvas.
            </p>
            <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {made.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/a/$artifactId"
                    params={{ artifactId: a.id }}
                    className="block rounded-xl border border-border-subtle bg-surface-1/50 p-4 transition-colors hover:border-accent-primary/35"
                  >
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">
                      {a.kind}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium">{a.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
