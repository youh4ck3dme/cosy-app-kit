import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { buildPreviewBridgeScript } from "@/lib/preview-bridge";
import { resolvePreviewNavTarget } from "@/lib/preview-nav";
import { injectScriptIntoHtmlHead } from "@/lib/preview-storage-polyfill";

const getPublicArtifact = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ id: z.uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
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
    const { data: row, error } = await sb
      .from("artifacts")
      .select("id,title,kind,content,files,entry_path,is_public")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return row as {
      id: string;
      title: string;
      kind: string;
      content: string;
      files: Array<{ path: string; language: string; content: string }> | null;
      entry_path: string | null;
    };
  });

export const Route = createFileRoute("/a/$artifactId/embed")({
  loader: ({ params }) => getPublicArtifact({ data: { id: params.artifactId } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Artifact"} · Embed` },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-[240px] items-center justify-center bg-background text-sm text-muted-foreground">
      Not found
    </div>
  ),
  component: EmbedPage,
});

function EmbedPage() {
  const artifact = Route.useLoaderData();
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeTokenRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tok-${Date.now()}`,
  );

  const files = useMemo(() => {
    if (!artifact) return [];
    return artifact.files && artifact.files.length > 0
      ? artifact.files
      : [{ path: "index.html", language: artifact.kind, content: artifact.content }];
  }, [artifact]);

  const filePaths = useMemo(() => files.map((f) => f.path), [files]);

  const entryPath =
    (artifact?.entry_path && files.some((f) => f.path === artifact.entry_path)
      ? artifact.entry_path
      : null) ??
    files.find((f) => /\.html?$/i.test(f.path))?.path ??
    files[0]?.path ??
    null;

  const resolvedPreviewPath =
    (previewPath && files.some((f) => f.path === previewPath) ? previewPath : null) ?? entryPath;

  const entry = useMemo(() => {
    if (!resolvedPreviewPath) return null;
    return files.find((f) => f.path === resolvedPreviewPath) ?? null;
  }, [files, resolvedPreviewPath]);

  const isHtml = Boolean(
    artifact && entry && (artifact.kind === "html" || /\.html?$/i.test(entry.path)),
  );

  const srcDoc = useMemo(() => {
    if (!isHtml || !entry) return null;
    return injectScriptIntoHtmlHead(entry.content, buildPreviewBridgeScript(bridgeTokenRef.current));
  }, [entry, isHtml, frameKey]);

  useEffect(() => {
    if (!artifact) throw notFound();
  }, [artifact]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.__builder_navigate !== bridgeTokenRef.current || typeof d.href !== "string") return;
      const current = resolvedPreviewPath ?? entryPath ?? "index.html";
      const target = resolvePreviewNavTarget(d.href, { filePaths, currentPath: current });
      if (target.kind !== "internal") return;
      setPreviewPath(target.path);
      bridgeTokenRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `tok-${Date.now()}`;
      setFrameKey((k) => k + 1);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [entryPath, filePaths, resolvedPreviewPath]);

  if (!artifact || !entry) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex-1">
        {isHtml && srcDoc ? (
          <iframe
            key={frameKey}
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-forms"
            className="block h-[calc(100vh-2.5rem)] w-full border-0 bg-white"
            title={artifact.title}
          />
        ) : (
          <article className="prose prose-invert prose-sm mx-auto max-w-3xl px-4 py-6">
            <h1>{artifact.title}</h1>
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </article>
        )}
      </div>
      <footer className="flex h-10 flex-none items-center justify-center border-t border-border-subtle bg-surface-1/80">
        <Link
          to="/"
          className="font-mono text-[11px] text-muted-foreground hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Made with Builder
        </Link>
      </footer>
    </div>
  );
}
