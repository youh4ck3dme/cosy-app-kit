import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates.seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates · Builder" },
      {
        name: "description",
        content: "Browse static Builder templates — landing pages, dashboards, docs, and app UI seeds.",
      },
    ],
  }),
  component: TemplatesIndexPage,
});

function TemplatesIndexPage() {
  const [cat, setCat] = useState<string>("All");
  const filtered = useMemo(
    () => (cat === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat)),
    [cat],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border-subtle px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="font-mono text-sm font-semibold tracking-tight">
            &gt;_ Builder
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link to="/chat" className="hover:text-foreground">
              Open chat
            </Link>
            <Link to="/auth" search={{ next: "" }} className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Static seeds you can drop into a new thread. Use template fills the composer — it does not auto-send.
        </p>

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Categories">
          {["All", ...TEMPLATE_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={cn(
                "min-h-11 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c
                  ? "border-accent-primary/50 bg-accent-primary/15 text-foreground"
                  : "border-border-subtle text-muted-foreground hover:bg-surface-2",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
          {filtered.map((t) => (
            <li key={t.slug}>
              <Link
                to="/templates/$slug"
                params={{ slug: t.slug }}
                className="block rounded-2xl border border-border-subtle bg-surface-1/40 p-5 transition-colors hover:border-accent-primary/35 hover:bg-surface-2"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.category}
                </div>
                <h2 className="mt-1 text-lg font-semibold">{t.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
