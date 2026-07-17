import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone, Tablet, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const getPublicArtifact = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row, error } = await sb
      .from("artifacts")
      .select("id,title,kind,content,files,entry_path,is_public,created_at")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row as {
      id: string; title: string; kind: string; content: string;
      files: Array<{ path: string; language: string; content: string }> | null;
      entry_path: string | null; created_at: string;
    };
  });

export const Route = createFileRoute("/a/$artifactId")({
  loader: ({ params }) => getPublicArtifact({ data: { id: params.artifactId } }),
  head: ({ loaderData }) => {
    const t = loaderData?.title ?? "Shared artifact";
    return {
      meta: [
        { title: `${t} · Builder` },
        { name: "description", content: `A live artifact shared from Builder — ${t}.` },
        { property: "og:title", content: `${t} · Builder` },
        { property: "og:description", content: "Live artifact shared from Builder." },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="font-mono text-6xl font-bold text-muted-foreground">404</div>
        <p className="mt-3 text-sm text-muted-foreground">This artifact isn't public or doesn't exist.</p>
      </div>
    </div>
  ),
  component: PublicArtifactPage,
});

type Device = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<Device, number> = { desktop: 1200, tablet: 768, mobile: 390 };

function PublicArtifactPage() {
  const artifact = Route.useLoaderData();
  const [device, setDevice] = useState<Device>("desktop");
  useEffect(() => {
    if (!artifact) throw notFound();
  }, [artifact]);
  if (!artifact) return null;

  const files = artifact.files && artifact.files.length > 0
    ? artifact.files
    : [{ path: "index.html", language: artifact.kind, content: artifact.content }];
  const entry = files.find((f) => f.path === artifact.entry_path) ?? files[0];
  const isHtml = artifact.kind === "html" || /\.html?$/i.test(entry.path);

  const srcDoc = useMemo(() => (isHtml ? entry.content : null), [entry, isHtml]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle glass px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm font-semibold">&gt;_ {artifact.title}</div>
          <span className="hidden rounded-full border border-border-subtle bg-surface-1/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-block">
            Public artifact
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHtml && (
            <div className="hidden items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 sm:flex">
              {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
                const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                const active = device === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDevice(d)}
                    className={cn(
                      "flex items-center justify-center rounded-md p-1.5",
                      active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-1/70 px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            <ExternalLink className="h-3 w-3" /> Made with Builder
          </a>
        </div>
      </header>

      <main className="flex justify-center p-4 sm:p-8">
        {isHtml && srcDoc ? (
          <div
            className="overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-elevated"
            style={{ width: WIDTHS[device], maxWidth: "100%" }}
          >
            <iframe
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-forms"
              className="block w-full border-0 bg-white"
              style={{ height: "80vh" }}
              title={artifact.title}
            />
          </div>
        ) : (
          <article className="prose prose-invert prose-sm max-w-3xl rounded-2xl border border-border-subtle bg-panel px-8 py-6 shadow-elevated">
            <h1 className="!mt-0">{artifact.title}</h1>
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}
