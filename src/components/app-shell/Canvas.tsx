import { useEffect, useMemo, useRef, useState } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Wand2,
  Code2,
  Eye,
  Terminal,
  Share2,
  Download,
  Check,
  X,
  Undo2,
  MoreHorizontal,
  History,
  Save,
  Loader2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  getArtifactVersion,
  listArtifactVersions,
  restoreArtifactVersion,
  setArtifactPublic,
  updateArtifactContent,
} from "@/lib/threads.functions";
import { springTransition, useReducedMotionSafe } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ArtifactFile = { path: string; language: string; content: string };
export type Artifact = {
  id: string;
  kind: "html" | "markdown" | "code";
  title: string;
  content: string;
  files?: ArtifactFile[] | null;
  entry_path?: string | null;
  is_public?: boolean | null;
};

type Device = "desktop" | "tablet" | "mobile";
type View = "preview" | "code";
type ConsoleEntry = { level: "log" | "warn" | "error"; args: string[]; ts: number };

const WIDTHS: Record<Device, number> = { desktop: 1200, tablet: 768, mobile: 390 };

// The sandboxed iframe uses srcDoc, so its origin is opaque ("null") and postMessage
// must target "*". Messages are instead authenticated with a per-mount random token
// plus an event.source check in the listener.
function consoleBridge(token: string): string {
  return `<script>(function(){
  const send = (level, args) => {
    try { parent.postMessage({ __builder_console: ${JSON.stringify(token)}, level, args: args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); }
    }) }, '*'); } catch(e) {}
  };
  ['log','warn','error'].forEach(l => {
    const orig = console[l];
    console[l] = function(){ send(l, [].slice.call(arguments)); orig.apply(console, arguments); };
  });
  window.addEventListener('error', e => send('error', [e.message + ' @ ' + (e.filename||'') + ':' + e.lineno]));
  window.addEventListener('unhandledrejection', e => send('error', ['Unhandled: ' + (e.reason && e.reason.message || e.reason)]));
})();</script>`;
}

function injectBridge(html: string, token: string): string {
  const bridge = consoleBridge(token);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${bridge}</body>`);
  return `${html}\n${bridge}`;
}

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path =
    a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

export function Canvas({ artifact }: { artifact?: Artifact }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<View>("preview");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [sharing, setSharing] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [bridgeToken] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const share = useServerFn(setArtifactPublic);
  const reducedMotion = useReducedMotionSafe();
  const qc = useQueryClient();
  const listVersions = useServerFn(listArtifactVersions);
  const getVersion = useServerFn(getArtifactVersion);
  const restoreVersion = useServerFn(restoreArtifactVersion);
  const saveContent = useServerFn(updateArtifactContent);
  const [showHistory, setShowHistory] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<{
    id: string;
    content: string;
    files: ArtifactFile[] | null;
    entry_path: string | null;
    created_at: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { data: versions } = useQuery({
    queryKey: ["artifact-versions", artifact?.id],
    queryFn: () => listVersions({ data: { artifactId: artifact!.id } }),
    enabled: Boolean(artifact) && showHistory,
  });

  const rawFiles = artifact ? fileList(artifact) : [];
  const liveFiles = rawFiles.map((f) => ({ ...f, content: edits[f.path] ?? f.content }));
  // When previewing an old version, show its snapshot instead of the live artifact.
  const files: ArtifactFile[] = previewVersion
    ? previewVersion.files && previewVersion.files.length > 0
      ? previewVersion.files
      : [
          {
            path: "index.html",
            language: artifact?.kind ?? "html",
            content: previewVersion.content,
          },
        ]
    : liveFiles;
  const entryPath = previewVersion ? previewVersion.entry_path : artifact?.entry_path;
  const isDirty = Object.keys(edits).length > 0;
  const currentFile =
    files.find((f) => f.path === activeFile) ?? files.find((f) => f.path === entryPath) ?? files[0];

  const srcDoc = useMemo(() => {
    if (!artifact) return null;
    const entry = files.find((f) => f.path === entryPath) ?? files[0];
    if (!entry) return null;
    if (artifact.kind === "html" || /\.html?$/i.test(entry.path)) {
      return injectBridge(entry.content, bridgeToken);
    }
    return null;
  }, [artifact, files, entryPath, bridgeToken]);

  const refresh = () => {
    setLogs([]);
    setIframeLoaded(false);
    setKey((k) => k + 1);
  };

  const resetEdits = () => {
    setEdits({});
    setLogs([]);
  };

  useEffect(() => {
    setActiveFile(null);
    setLogs([]);
    setEdits({});
    setIframeLoaded(false);
    setPreviewVersion(null);
    setShowHistory(false);
    setKey((k) => k + 1);
  }, [artifact?.id]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Only accept messages from our own preview iframe carrying this mount's token.
      if (e.source !== iframeRef.current?.contentWindow) return;
      const d = e.data;
      if (d && d.__builder_console === bridgeToken) {
        setLogs((prev) => [...prev.slice(-199), { level: d.level, args: d.args, ts: Date.now() }]);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [bridgeToken]);

  const handleShare = async () => {
    if (!artifact) return;
    setSharing(true);
    try {
      const next = !artifact.is_public;
      await share({ data: { artifactId: artifact.id, isPublic: next } });
      haptic();
      if (next) {
        const url = `${window.location.origin}/a/${artifact.id}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Public link copied", { description: url });
      } else {
        toast.success("Share link disabled");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setSharing(false);
    }
  };

  const openVersion = async (versionId: string) => {
    try {
      const v = await getVersion({ data: { versionId } });
      setPreviewVersion(v as typeof previewVersion);
      // Unsaved live edits must not linger (or get saved) while viewing history.
      setEdits({});
      setIframeLoaded(false);
      setKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load version");
    }
  };

  const backToLatest = () => {
    setPreviewVersion(null);
    setIframeLoaded(false);
    setKey((k) => k + 1);
  };

  const handleRestore = async () => {
    if (!previewVersion || restoring) return;
    setRestoring(true);
    try {
      await restoreVersion({ data: { versionId: previewVersion.id } });
      haptic();
      toast.success("Version restored");
      setPreviewVersion(null);
      // Thread queries hold the artifacts; prefix match refreshes whichever thread is open.
      qc.invalidateQueries({ queryKey: ["thread"] });
      qc.invalidateQueries({ queryKey: ["artifact-versions", artifact?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!artifact || !isDirty || saving) return;
    setSaving(true);
    try {
      if (artifact.files && artifact.files.length > 0) {
        await saveContent({ data: { artifactId: artifact.id, files: liveFiles } });
      } else {
        await saveContent({
          data: { artifactId: artifact.id, content: liveFiles[0]?.content ?? "" },
        });
      }
      haptic();
      setEdits({});
      toast.success("Edits saved");
      qc.invalidateQueries({ queryKey: ["thread"] });
      qc.invalidateQueries({ queryKey: ["artifact-versions", artifact.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!artifact) return;
    if (files.length === 1) {
      const f = files[0];
      const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = f.path.split("/").pop() ?? "artifact.txt";
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    // Multi-file: lazy-load jszip only when needed.
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const f of files) zip.file(f.path, f.content);
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title.replace(/\W+/g, "-").toLowerCase() || "artifact"}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed (jszip missing?)");
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_oklab,var(--color-background)_94%,black)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-fade opacity-70"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-40" />

      {/* Top toolbar */}
      <div className="relative z-10 flex flex-none items-center justify-between gap-2 border-b border-border-subtle glass px-3 py-2">
        <div className="flex items-center gap-2">
          {/* Preview / Code toggle */}
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5">
            {(
              [
                { key: "preview", Icon: Eye, label: "Preview" },
                { key: "code", Icon: Code2, label: "Code" },
              ] as const
            ).map(({ key: k, Icon, label }) => {
              const active = view === k;
              return (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-surface-3 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {view === "preview" && srcDoc && (
            <>
              <div className="hidden h-4 w-px bg-border-subtle sm:block" />
              <div className="hidden items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 sm:flex">
                {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
                  const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                  const active = device === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={cn(
                        "flex items-center justify-center rounded-md p-1.5 transition-all",
                        active
                          ? "bg-surface-3 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
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
                className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:block"
                title="Refresh preview"
                aria-label="Refresh preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              {/* Compact overflow menu — holds the controls hidden on small screens */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Preview options"
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:hidden"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel>Device</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={device}
                    onValueChange={(d) => setDevice(d as Device)}
                  >
                    {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
                      <DropdownMenuRadioItem key={d} value={d} className="capitalize">
                        {d}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)));
                    }}
                  >
                    <ZoomIn className="mr-2 h-3.5 w-3.5" /> Zoom in
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
                    }}
                  >
                    <ZoomOut className="mr-2 h-3.5 w-3.5" /> Zoom out
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={refresh}>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {view === "preview" && srcDoc && (
            <div className="hidden items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 text-xs font-mono text-muted-foreground sm:flex">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                className="rounded-md p-1.5 hover:text-foreground"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                className="rounded-md p-1.5 hover:text-foreground"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {artifact && srcDoc && (
            <button
              onClick={() => setShowConsole((s) => !s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                showConsole
                  ? "bg-surface-3 text-foreground"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              )}
              title="Console"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Console</span>
              {logs.length > 0 && (
                <span className="rounded-full bg-accent-primary/20 px-1.5 text-[10px] font-mono text-accent-primary tabular-nums">
                  {logs.length}
                </span>
              )}
            </button>
          )}
          {artifact && (
            <>
              <button
                onClick={() => setShowHistory((s) => !s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  showHistory
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
                title="Version history"
                aria-label="Version history"
                aria-expanded={showHistory}
              >
                <History className="h-3.5 w-3.5" />
                <span className="hidden md:inline">History</span>
              </button>
              <button
                onClick={handleExport}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  artifact.is_public
                    ? "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
                title={artifact.is_public ? "Public — click to unshare" : "Share publicly"}
              >
                {artifact.is_public ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{artifact.is_public ? "Shared" : "Share"}</span>
              </button>
            </>
          )}
          {artifact?.kind === "html" && srcDoc && (
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) {
                  w.document.open();
                  w.document.write(srcDoc);
                  w.document.close();
                }
              }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* File tabs (when multi-file OR in code view) */}
      {artifact && (files.length > 1 || view === "code") && (
        <div className="relative z-10 flex flex-none items-center gap-0.5 overflow-x-auto border-b border-border-subtle bg-surface-1/40 px-2 no-scrollbar">
          {files.map((f) => {
            const active = currentFile?.path === f.path;
            const edited = edits[f.path] !== undefined;
            return (
              <button
                key={f.path}
                onClick={() => setActiveFile(f.path)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-1.5 font-mono text-[11px] transition-colors",
                  active
                    ? "border-accent-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {f.path}
                {edited && <span className="ml-1.5 text-accent-primary">●</span>}
              </button>
            );
          })}
          {isDirty && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <button
                onClick={resetEdits}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                title="Discard edits"
              >
                <Undo2 className="h-3 w-3" /> Reset
              </button>
              <button
                onClick={handleSaveEdits}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-md bg-accent-primary/15 px-2 py-1 text-[11px] font-medium text-accent-primary hover:bg-accent-primary/25 disabled:opacity-50"
                title="Save edits to this artifact"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Version-preview banner */}
      {previewVersion && (
        <div className="relative z-10 flex flex-none flex-wrap items-center justify-between gap-2 border-b border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5 text-xs animate-in-fade">
          <span className="text-foreground/90">
            Viewing version from{" "}
            {formatDistanceToNow(new Date(previewVersion.created_at), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={backToLatest}
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              Back to latest
            </button>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-1 rounded-md bg-accent-primary px-2.5 py-1 font-medium text-accent-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {restoring && <Loader2 className="h-3 w-3 animate-spin" />}
              Restore this version
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "flex flex-1 justify-center overflow-auto p-4 sm:p-8",
            view === "code" ? "items-stretch" : "items-start",
          )}
        >
          {!artifact && <EmptyCanvas />}

          {artifact && view === "preview" && srcDoc && (
            <motion.div
              className="max-w-full flex-none overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-elevated animate-in-scale"
              initial={false}
              animate={{ width: WIDTHS[device] * zoom }}
              transition={reducedMotion ? { duration: 0 } : springTransition}
            >
              <div className="flex h-8 items-center gap-1.5 border-b border-border-subtle bg-surface-1/60 px-3">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.20_25)]/50" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.80_0.16_85)]/50" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.18_150)]/50" />
                <div className="ml-3 flex flex-1 items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {artifact.title}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                  {WIDTHS[device]}px
                </span>
              </div>
              <div className="relative">
                {!iframeLoaded && (
                  <div className="absolute inset-0 z-10 space-y-3 bg-panel p-6" aria-hidden>
                    <Skeleton className="h-8 w-2/3 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                  </div>
                )}
                <iframe
                  key={key}
                  ref={iframeRef}
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-forms"
                  onLoad={() => setIframeLoaded(true)}
                  className="block w-full border-0 bg-white"
                  style={{ height: `${(720 * zoom).toFixed(0)}px` }}
                  title={artifact.title}
                />
              </div>
            </motion.div>
          )}

          {artifact && view === "preview" && !srcDoc && artifact.kind === "markdown" && (
            <article
              className="prose prose-invert prose-sm max-w-3xl rounded-2xl border border-border-subtle bg-panel px-8 py-6 shadow-elevated animate-in-scale"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              <h2 className="!mt-0">{artifact.title}</h2>
              <ReactMarkdown>{currentFile?.content ?? artifact.content}</ReactMarkdown>
            </article>
          )}

          {artifact && view === "code" && currentFile && (
            <textarea
              key={currentFile.path}
              value={currentFile.content}
              onChange={(e) => {
                const val = e.target.value;
                const path = currentFile.path;
                setEdits((prev) => ({ ...prev, [path]: val }));
              }}
              spellCheck={false}
              readOnly={Boolean(previewVersion)}
              aria-label={`Edit ${currentFile.path}`}
              className="min-h-64 w-full max-w-5xl resize-none overflow-auto rounded-2xl border border-border-subtle bg-surface-1/80 p-5 font-mono text-[12.5px] leading-relaxed text-foreground/90 shadow-elevated outline-none ring-0 focus:border-accent-primary/60 focus:bg-surface-1 animate-in-fade"
            />
          )}
        </div>

        {/* Version history panel */}
        {showHistory && artifact && (
          <div className="absolute right-3 top-3 z-20 flex max-h-[70%] w-72 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-border-subtle bg-popover shadow-elevated animate-in-scale">
            <div className="flex flex-none items-center justify-between border-b border-border-subtle px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <History className="h-3 w-3" /> Version history
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                aria-label="Close version history"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              <button
                onClick={backToLatest}
                className={cn(
                  "flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface-2",
                  !previewVersion && "bg-surface-2",
                )}
              >
                <span className="font-medium text-foreground">Latest</span>
                <span className="text-muted-foreground">Current state of the artifact</span>
              </button>
              {(versions ?? []).map((v) => (
                <button
                  key={v.id}
                  onClick={() => openVersion(v.id)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-surface-2",
                    previewVersion?.id === v.id && "bg-surface-2",
                  )}
                >
                  <span className="font-medium text-foreground">
                    {v.label ?? formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                </button>
              ))}
              {versions && versions.length === 0 && (
                <div className="px-2.5 py-4 text-center text-xs text-muted-foreground">
                  No earlier versions yet. Snapshots appear when the artifact changes.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Console drawer */}
        {showConsole && (
          <div className="relative z-10 flex max-h-64 min-h-32 flex-none flex-col border-t border-border-subtle bg-surface-1/95 backdrop-blur">
            <div className="flex flex-none items-center justify-between border-b border-border-subtle px-3 py-1.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Terminal className="h-3 w-3" />
                Console
                <span className="font-mono tabular-nums text-muted-foreground/70">
                  {logs.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLogs([])}
                  className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowConsole(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
              {logs.length === 0 && (
                <div className="py-2 text-muted-foreground/70">
                  No output yet — logs from the preview will appear here.
                </div>
              )}
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-b border-border-subtle/50 py-1 last:border-b-0",
                    l.level === "error" && "text-[oklch(0.72_0.19_25)]",
                    l.level === "warn" && "text-[oklch(0.82_0.16_75)]",
                    l.level === "log" && "text-foreground/85",
                  )}
                >
                  <span className="mr-2 select-none text-muted-foreground/50">{l.level}</span>
                  {l.args.join(" ")}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center py-16 text-center animate-in-fade">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/70 px-3 py-1.5 font-mono text-[11px] tracking-widest text-muted-foreground backdrop-blur">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent-primary/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-primary" />
        </span>
        BUILDER · LIVE CANVAS
      </div>
      <h1 className="font-mono text-4xl font-bold tracking-tighter sm:text-6xl">
        <span className="text-gradient-accent">&gt;_ Build</span>
        <br />
        anything.
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
        Describe what you want on the left. Watch it render here — pixel-perfect, instantly
        editable, and always in view.
      </p>
      <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-2 text-left">
        {[
          { icon: Monitor, label: "Desktop" },
          { icon: Tablet, label: "Tablet" },
          { icon: Smartphone, label: "Mobile" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-2 rounded-xl border border-border-subtle bg-surface-1/40 p-3 backdrop-blur"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
        <Wand2 className="h-3 w-3" />
        Try: "Design a hero for a rocket startup"
      </div>
    </div>
  );
}
