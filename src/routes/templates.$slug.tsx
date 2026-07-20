import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createThread } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  getTemplateBySlug,
  TEMPLATE_PROMPT_STORAGE_KEY,
} from "@/lib/templates.seed";

export const Route = createFileRoute("/templates/$slug")({
  loader: ({ params }) => {
    const t = getTemplateBySlug(params.slug);
    if (!t) throw new Error("Template not found");
    return t;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Template"} · Builder` },
      {
        name: "description",
        content: loaderData?.blurb ?? "Builder template",
      },
    ],
  }),
  component: TemplateDetailPage,
});

function TemplateDetailPage() {
  const t = Route.useLoaderData();
  const navigate = useNavigate();
  const create = useServerFn(createThread);
  const [busy, setBusy] = useState(false);

  const useTemplate = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem(TEMPLATE_PROMPT_STORAGE_KEY, t.prompt);
        navigate({ to: "/auth", search: { next: "/chat" } });
        return;
      }
      const { id } = await create({ data: {} });
      sessionStorage.setItem(TEMPLATE_PROMPT_STORAGE_KEY, t.prompt);
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start thread");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border-subtle px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link to="/templates" className="text-sm text-muted-foreground hover:text-foreground">
            ← Templates
          </Link>
          <Link to="/" className="font-mono text-sm font-semibold">
            &gt;_ Builder
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {t.category}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-muted-foreground">{t.blurb}</p>
        <pre className="mt-6 overflow-x-auto rounded-xl border border-border-subtle bg-surface-1/50 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap">
          {t.prompt}
        </pre>
        <button
          type="button"
          disabled={busy}
          onClick={() => void useTemplate()}
          className="mt-8 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Starting…" : "Use template"}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          Opens a new chat with this prompt in the composer. Nothing is sent until you hit send.
        </p>
      </main>
    </div>
  );
}
