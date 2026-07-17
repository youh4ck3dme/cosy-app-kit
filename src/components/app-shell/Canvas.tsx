import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, ZoomIn, ZoomOut } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type Artifact = {
  id: string;
  kind: "html" | "markdown" | "code";
  title: string;
  content: string;
};

type Device = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<Device, number> = { desktop: 1200, tablet: 768, mobile: 390 };

export function Canvas({ artifact }: { artifact?: Artifact }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [key, setKey] = useState(0);

  const srcDoc = useMemo(() => {
    if (!artifact || artifact.kind !== "html") return null;
    return artifact.content;
  }, [artifact]);

  const refresh = () => setKey((k) => k + 1);

  useEffect(() => setKey((k) => k + 1), [artifact?.id]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-[color-mix(in_oklab,var(--color-background)_92%,black)] bg-grid-pattern">
      {/* Top toolbar */}
      <div className="flex flex-none items-center justify-between border-b border-border/60 bg-background/40 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="hidden gap-1.5 sm:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
            {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              const active = device === d;
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    "flex items-center justify-center rounded p-1.5 transition-colors",
                    active ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  title={d}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={refresh}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-mono text-muted-foreground">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
              className="rounded p-1.5 hover:text-foreground"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              className="rounded p-1.5 hover:text-foreground"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
          {artifact?.kind === "html" && (
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (w && srcDoc) {
                  w.document.open();
                  w.document.write(srcDoc);
                  w.document.close();
                }
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
        {!artifact && <EmptyCanvas />}
        {artifact?.kind === "html" && (
          <div
            className="flex-none overflow-hidden rounded-xl border border-border bg-panel shadow-[0_0_60px_rgba(0,0,0,0.5)]"
            style={{
              width: WIDTHS[device] * zoom,
              maxWidth: "100%",
            }}
          >
            <div className="flex h-8 items-center gap-1.5 border-b border-border bg-surface/40 px-3">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="h-2 w-2 rounded-full bg-border" />
              <div className="ml-3 truncate font-mono text-[10px] text-muted-foreground">
                {artifact.title}
              </div>
            </div>
            <iframe
              key={key}
              ref={iframeRef}
              srcDoc={srcDoc ?? ""}
              sandbox="allow-scripts allow-forms"
              className="block w-full border-0 bg-white"
              style={{ height: `${(700 * zoom).toFixed(0)}px` }}
              title={artifact.title}
            />
          </div>
        )}
        {artifact?.kind === "markdown" && (
          <article
            className="prose prose-invert prose-sm max-w-3xl rounded-xl border border-border bg-panel px-8 py-6 shadow-2xl"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          >
            <h2 className="!mt-0">{artifact.title}</h2>
            <ReactMarkdown>{artifact.content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/50 px-3 py-1.5 font-mono text-[11px] tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" />
        BUILDER.LIVE
      </div>
      <h1 className="font-mono text-4xl font-bold tracking-tighter sm:text-6xl">
        &gt;_ AI
        <br />
        BUILDER
      </h1>
      <p className="mx-auto mt-6 max-w-md font-mono text-sm text-muted-foreground">
        // Ask on the left · watch the artifact render on the right · edit any time
      </p>
    </div>
  );
}
