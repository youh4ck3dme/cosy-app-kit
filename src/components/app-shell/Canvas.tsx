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
  Columns2,
  Save,
  Maximize2,
  Network,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";
import { setArtifactPublic, updateArtifactFiles } from "@/lib/threads.functions";
import { exportArtifactDownload } from "@/lib/export-artifact";
import { MonacoEditor } from "@/components/canvas/MonacoEditor";
import { MonacoDiff } from "@/components/canvas/MonacoDiff";
import { NetworkPanel, type NetworkEntry } from "@/components/canvas/NetworkPanel";
import { VersionTimeline } from "@/components/canvas/VersionTimeline";
import {
  latestSnippetForFile,
  type EditFileSnippet,
} from "@/lib/edit-snippets";

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
type View = "preview" | "code" | "diff";
type ConsoleEntry = { level: "log" | "warn" | "error"; args: string[]; ts: number };
type ConsoleFilter = "all" | "log" | "warn" | "error";

const WIDTHS: Record<Device, number> = { desktop: 1200, tablet: 768, mobile: 420 };

/**
 * Sandboxed iframe uses srcDoc (opaque origin "null") so postMessage target is "*".
 * Authenticate with a per-mount random token + event.source === iframe.contentWindow.
 */
function previewBridge(token: string): string {
  const t = JSON.stringify(token);
  return `<script>(function(){
  var TOKEN = ${t};
  var sendConsole = function(level, args) {
    try { parent.postMessage({ __builder_console: TOKEN, level: level, args: args.map(function(a) {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); }
    }) }, '*'); } catch(e) {}
  };
  ['log','warn','error'].forEach(function(l) {
    var orig = console[l];
    console[l] = function(){ sendConsole(l, [].slice.call(arguments)); orig.apply(console, arguments); };
  });
  window.addEventListener('error', function(e) {
    sendConsole('error', [e.message + ' @ ' + (e.filename||'') + ':' + e.lineno]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    sendConsole('error', ['Unhandled: ' + (e.reason && e.reason.message || e.reason)]);
  });
  var origFetch = window.fetch.bind(window);
  window.fetch = function() {
    var args = arguments;
    var input = args[0];
    var init = args[1] || {};
    var method = (init.method || 'GET').toUpperCase();
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var started = performance.now();
    var id = Math.random().toString(36).slice(2);
    try { parent.postMessage({ __builder_network: TOKEN, phase: 'start', id: id, method: method, url: url }, '*'); } catch(e) {}
    return origFetch.apply(window, args).then(function(res) {
      try { parent.postMessage({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, status: res.status, ms: Math.round(performance.now() - started) }, '*'); } catch(e) {}
      return res;
    }).catch(function(err) {
      try { parent.postMessage({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, status: 0, ms: Math.round(performance.now() - started) }, '*'); } catch(e) {}
      throw err;
    });
  };
})();</script>`;
}

function injectBridge(html: string, token: string): string {
  const bridge = previewBridge(token);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${bridge}</body>`);
  return `${html}\n${bridge}`;
}

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path = a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

function deviceStorageKey(threadId?: string) {
  return threadId ? `builder:device:${threadId}` : "builder:device:global";
}

export function Canvas({
  artifact,
  threadId,
  editSnippets = [],
}: {
  artifact?: Artifact;
  threadId?: string;
  /** From chat tool parts — enables Diff “Show model change”. */
  editSnippets?: EditFileSnippet[];
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<View>("preview");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [showConsole, setShowConsole] = useState(false);
  const [showNetwork, setShowNetwork] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [logs, setLogs] = useState<ConsoleEntry[]>([]);
  const [consoleFilter, setConsoleFilter] = useState<ConsoleFilter>("all");
  const [network, setNetwork] = useState<NetworkEntry[]>([]);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [undoStack, setUndoStack] = useState<Record<string, string>[]>([]);
  const [diffMode, setDiffMode] = useState<"local" | "model">("local");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /** Per-mount token so we ignore console/network spam from other frames. */
  const bridgeTokenRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const share = useServerFn(setArtifactPublic);
  const saveFiles = useServerFn(updateArtifactFiles);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(deviceStorageKey(threadId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { device?: Device; customWidth?: number | null };
      if (parsed.device) setDevice(parsed.device);
      if (typeof parsed.customWidth === "number") setCustomWidth(parsed.customWidth);
    } catch {
      /* ignore */
    }
  }, [threadId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        deviceStorageKey(threadId),
        JSON.stringify({ device, customWidth }),
      );
    } catch {
      /* ignore */
    }
  }, [device, customWidth, threadId]);

  const rawFiles = artifact ? fileList(artifact) : [];
  const files = rawFiles.map((f) => ({ ...f, content: edits[f.path] ?? f.content }));
  const isDirty = Object.keys(edits).length > 0;
  const currentFile =
    files.find((f) => f.path === activeFile) ??
    files.find((f) => f.path === artifact?.entry_path) ??
    files[0];
  const originalCurrent = rawFiles.find((f) => f.path === currentFile?.path);

  const modelSnippet = currentFile
    ? latestSnippetForFile(editSnippets, currentFile.path, artifact?.id)
    : null;

  useEffect(() => {
    // Fall back to local when switching files without a model snippet
    if (diffMode === "model" && !modelSnippet) setDiffMode("local");
  }, [diffMode, modelSnippet]);

  const previewWidth = customWidth && customWidth > 0 ? customWidth : WIDTHS[device];

  const srcDoc = useMemo(() => {
    if (!artifact) return null;
    const entry = files.find((f) => f.path === artifact.entry_path) ?? files[0];
    if (!entry) return null;
    if (artifact.kind === "html" || /\.html?$/i.test(entry.path)) {
      return injectBridge(entry.content, bridgeTokenRef.current);
    }
    return null;
  }, [artifact, files, key]);

  const refresh = () => {
    setLogs([]);
    setNetwork([]);
    // New token on hard refresh so stale iframe messages cannot land.
    bridgeTokenRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setKey((k) => k + 1);
  };

  useEffect(() => {
    if (!isDirty || view !== "preview") return;
    const t = window.setTimeout(() => {
      setLogs([]);
      setKey((k) => k + 1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [edits, isDirty, view]);

  const resetEdits = () => {
    if (Object.keys(edits).length) setUndoStack((s) => [...s.slice(-4), edits]);
    setEdits({});
    setLogs([]);
  };

  const restoreUndo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack((s) => s.slice(0, -1));
    setEdits(last);
  };

  const revertCurrentFile = async () => {
    if (!artifact || !currentFile || !originalCurrent) return;
    const nextEdits = { ...edits };
    delete nextEdits[currentFile.path];
    setEdits(nextEdits);
    if (!Object.keys(nextEdits).length) {
      toast.success(`Reverted ${currentFile.path}`);
      return;
    }
    try {
      const nextFiles = rawFiles.map((f) =>
        f.path === currentFile.path ? originalCurrent : { ...f, content: nextEdits[f.path] ?? f.content },
      );
      await saveFiles({
        data: {
          artifactId: artifact.id,
          files: nextFiles,
          entry_path: artifact.entry_path ?? undefined,
        },
      });
      toast.success(`Reverted ${currentFile.path}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revert failed");
    }
  };

  useEffect(() => {
    setActiveFile(null);
    setLogs([]);
    setNetwork([]);
    setEdits({});
    setUndoStack([]);
    bridgeTokenRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setKey((k) => k + 1);
  }, [artifact?.id]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Only accept messages from our preview iframe + matching mount token.
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== "object") return;
      const token = bridgeTokenRef.current;
      if (d.__builder_console === token) {
        setLogs((prev) => [...prev.slice(-199), { level: d.level, args: d.args, ts: Date.now() }]);
      }
      if (d.__builder_network === token) {
        if (d.phase === "start") {
          setNetwork((prev) =>
            [
              ...prev,
              {
                id: d.id,
                method: d.method,
                url: d.url,
                status: null,
                ms: null,
                ts: Date.now(),
              },
            ].slice(-100),
          );
        } else if (d.phase === "end") {
          setNetwork((prev) =>
            prev.map((row) =>
              row.id === d.id ? { ...row, status: d.status, ms: d.ms } : row,
            ),
          );
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.closest(".monaco-editor"));
      if (e.key === "Escape" && fullscreen) {
        e.preventDefault();
        setFullscreen(false);
        return;
      }
      if (typing) return;
      if ((e.key === "f" || e.key === "F") && srcDoc && view === "preview") {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, srcDoc, view]);

  const handleShare = async () => {
    if (!artifact) return;
    setSharing(true);
    try {
      const next = !artifact.is_public;
      await share({ data: { artifactId: artifact.id, isPublic: next } });
      if (next) {
        setShowShare(true);
        const url = `${window.location.origin}/a/${artifact.id}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Public link copied", { description: url });
      } else {
        setShowShare(false);
        toast.success("Share link disabled");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Share failed");
    } finally {
      setSharing(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!artifact || !isDirty) return;
    setSaving(true);
    try {
      await saveFiles({
        data: {
          artifactId: artifact.id,
          files,
          entry_path: artifact.entry_path ?? undefined,
        },
      });
      setUndoStack((s) => [...s.slice(-4), edits]);
      setEdits({});
      toast.success("Saved to artifact");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!artifact) return;
    try {
      await exportArtifactDownload(artifact, files);
    } catch {
      toast.error("Export failed");
    }
  };

  const filteredLogs =
    consoleFilter === "all" ? logs : logs.filter((l) => l.level === consoleFilter);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_oklab,var(--color-background)_94%,black)]",
        fullscreen && "fixed inset-0 z-50 bg-background",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-fade opacity-70" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-40" />

      <div className="relative z-10 flex flex-none items-center justify-between gap-2 border-b border-border-subtle glass px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5">
            {(
              [
                { key: "preview", Icon: Eye, label: "Preview" },
                { key: "code", Icon: Code2, label: "Code" },
                { key: "diff", Icon: Columns2, label: "Diff" },
              ] as const
            ).map(({ key: k, Icon, label }) => {
              const active = view === k;
              return (
                <button
                  key={k}
                  onClick={() => setView(k)}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-surface-3 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  title={label}
                  aria-label={label}
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
                  const active = device === d && !customWidth;
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        setCustomWidth(null);
                        setDevice(d);
                      }}
                      className={cn(
                        "flex min-h-9 min-w-9 items-center justify-center rounded-md p-1.5 transition-all",
                        active
                          ? "bg-surface-3 text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      title={d}
                      aria-label={`${d} preview width`}
                      aria-pressed={active}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <label className="hidden items-center gap-1 font-mono text-[10px] text-muted-foreground sm:flex">
                px
                <input
                  type="number"
                  min={280}
                  max={1600}
                  value={customWidth ?? ""}
                  placeholder={String(WIDTHS[device])}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setCustomWidth(Number.isFinite(n) && n > 0 ? n : null);
                  }}
                  className="h-8 w-16 rounded-md border border-border-subtle bg-surface-1 px-1.5 text-[11px] text-foreground"
                  aria-label="Custom preview width"
                />
              </label>
              <button
                onClick={refresh}
                className="min-h-9 min-w-9 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                title="Refresh preview"
                aria-label="Refresh preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setFullscreen((v) => !v)}
                className="min-h-9 min-w-9 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                title="Fullscreen (F)"
                aria-label="Toggle fullscreen preview"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
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
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}
                className="rounded-md p-1.5 hover:text-foreground"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {artifact && srcDoc && (
            <>
              <button
                onClick={() => {
                  setShowConsole((s) => !s);
                  if (!showConsole) setShowNetwork(false);
                }}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  showConsole
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
                title="Console"
                aria-label="Toggle console"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Console</span>
                {logs.length > 0 && (
                  <span className="rounded-full bg-accent-primary/20 px-1.5 text-[10px] font-mono text-accent-primary tabular-nums">
                    {logs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setShowNetwork((s) => !s);
                  if (!showNetwork) setShowConsole(false);
                }}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  showNetwork
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
                title="Network"
                aria-label="Toggle network panel"
              >
                <Network className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Net</span>
                {network.length > 0 && (
                  <span className="rounded-full bg-accent-primary/20 px-1.5 text-[10px] font-mono text-accent-primary tabular-nums">
                    {network.length}
                  </span>
                )}
              </button>
            </>
          )}
          {artifact && (
            <>
              <VersionTimeline artifactId={artifact.id} threadId={threadId} />
              <button
                onClick={handleExport}
                className="min-h-9 min-w-9 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                title="Download"
                aria-label="Download artifact"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  artifact.is_public
                    ? "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
                title={artifact.is_public ? "Public — click to unshare" : "Share publicly"}
                aria-label={artifact.is_public ? "Disable public share" : "Share publicly"}
              >
                {artifact.is_public ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
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
              className="min-h-9 min-w-9 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {artifact && (files.length > 1 || view === "code" || view === "diff") && (
        <div className="relative z-10 flex flex-none items-center gap-0.5 overflow-x-auto border-b border-border-subtle bg-surface-1/40 px-2 no-scrollbar">
          {files.map((f) => {
            const active = currentFile?.path === f.path;
            const edited = edits[f.path] !== undefined;
            return (
              <button
                key={f.path}
                onClick={() => setActiveFile(f.path)}
                className={cn(
                  "min-h-11 shrink-0 border-b-2 px-3 py-1.5 font-mono text-[11px] transition-colors",
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
            <button
              onClick={resetEdits}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              title="Discard edits"
            >
              <Undo2 className="h-3 w-3" /> Reset
            </button>
          )}
          {undoStack.length > 0 && (
            <button
              onClick={restoreUndo}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              title="Restore previous edits"
            >
              Undo stack
            </button>
          )}
          {view === "diff" && (
            <>
              {modelSnippet && (
                <button
                  type="button"
                  onClick={() => setDiffMode((m) => (m === "model" ? "local" : "model"))}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] hover:bg-surface-2",
                    diffMode === "model"
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "text-muted-foreground",
                  )}
                  title="Compare edit_file beforeSnippet / afterSnippet from the model"
                >
                  {diffMode === "model" ? "Showing model change" : "Show model change"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDiffMode("local");
                  setView("preview");
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void revertCurrentFile()}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2"
              >
                Revert
              </button>
            </>
          )}
          {isDirty && (
            <button
              onClick={handleSaveEdits}
              disabled={saving}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
              title="Save edits to artifact"
            >
              <Save className="h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      )}

      <div className="relative z-0 flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
          {!artifact && <EmptyCanvas />}

          {artifact && view === "preview" && srcDoc && (
            <div
              className="flex-none overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-elevated animate-in-scale"
              style={{ width: previewWidth * zoom, maxWidth: "100%" }}
            >
              <div className="flex h-8 items-center gap-1.5 border-b border-border-subtle bg-surface-1/60 px-3">
                <span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.20_25)]/50" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.80_0.16_85)]/50" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.18_150)]/50" />
                <div className="ml-3 flex flex-1 items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-muted-foreground">{artifact.title}</span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                  {previewWidth}px
                </span>
              </div>
              {/*
                Sandbox: scripts+forms only — no same-origin, no top-nav, no downloads.
                Preview is untrusted user/agent HTML; keep capabilities minimal.
              */}
              <iframe
                key={key}
                ref={iframeRef}
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-forms"
                className="block w-full border-0 bg-white"
                style={{ height: fullscreen ? "calc(100vh - 8rem)" : `${(720 * zoom).toFixed(0)}px` }}
                title={artifact.title}
              />
            </div>
          )}

          {artifact && view === "preview" && !srcDoc && artifact.kind === "markdown" && (
            <article
              className="prose prose-invert prose-sm max-w-3xl rounded-2xl border border-border-subtle bg-panel px-8 py-6 shadow-elevated animate-in-scale"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              <h2 className="mt-0!">{artifact.title}</h2>
              <ReactMarkdown>{currentFile?.content ?? artifact.content}</ReactMarkdown>
            </article>
          )}

          {artifact && view === "code" && currentFile && (
            <MonacoEditor
              path={currentFile.path}
              value={currentFile.content}
              language={currentFile.language}
              onChange={(val) => {
                const path = currentFile.path;
                setEdits((prev) => ({ ...prev, [path]: val }));
              }}
            />
          )}

          {artifact && view === "diff" && currentFile && (
            <div className="flex w-full max-w-6xl flex-col gap-2">
              <p className="px-1 text-[11px] text-muted-foreground">
                {diffMode === "model" && modelSnippet
                  ? "Model change — edit_file beforeSnippet → afterSnippet"
                  : "Local edits — saved file vs current buffer (undo stack if you Reset)"}
              </p>
              <MonacoDiff
                path={currentFile.path}
                language={currentFile.language}
                original={
                  diffMode === "model" && modelSnippet
                    ? modelSnippet.beforeSnippet
                    : (originalCurrent?.content ?? "")
                }
                modified={
                  diffMode === "model" && modelSnippet
                    ? modelSnippet.afterSnippet
                    : currentFile.content
                }
              />
            </div>
          )}
        </div>

        {showShare && artifact?.is_public && (
          <div className="relative z-10 border-t border-border-subtle bg-surface-1/95 px-4 py-3 backdrop-blur">
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="flex gap-3">
                <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-2 sm:block">
                  {srcDoc ? (
                    <iframe
                      srcDoc={srcDoc}
                      sandbox=""
                      className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                      title="Share preview"
                      tabIndex={-1}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-[10px] text-muted-foreground">
                      {artifact.kind}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold">Share</div>
                  <div className="truncate text-sm">{artifact.title}</div>
                  <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/a/${artifact.id}`
                      : `/a/${artifact.id}`}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-xs"
                  onClick={async () => {
                    const url = `${window.location.origin}/a/${artifact.id}`;
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-xs"
                  onClick={async () => {
                    const embed = `<iframe src="${window.location.origin}/a/${artifact.id}/embed" style="width:100%;height:640px;border:0;border-radius:12px" title="${artifact.title}"></iframe>`;
                    await navigator.clipboard.writeText(embed);
                    toast.success("Embed code copied");
                  }}
                >
                  Copy embed
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-border px-3 text-xs"
                  onClick={handleExport}
                >
                  Download ZIP
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md px-2 text-xs text-muted-foreground"
                  onClick={() => setShowShare(false)}
                  aria-label="Close share panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {showConsole && (
          <div className="relative z-10 flex max-h-64 min-h-32 flex-none flex-col border-t border-border-subtle bg-surface-1/95 backdrop-blur">
            <div className="flex flex-none items-center justify-between border-b border-border-subtle px-3 py-1.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Terminal className="h-3 w-3" />
                Console
                <span className="font-mono tabular-nums text-muted-foreground/70">
                  {filteredLogs.length}
                </span>
                <div className="ml-2 flex gap-0.5">
                  {(["all", "log", "warn", "error"] as ConsoleFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setConsoleFilter(f)}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                        consoleFilter === f
                          ? "bg-surface-3 text-foreground"
                          : "text-muted-foreground hover:bg-surface-2",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
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
                  aria-label="Close console"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11.5px] leading-relaxed">
              {filteredLogs.length === 0 && (
                <div className="py-2 text-muted-foreground/70">
                  No output yet — logs from the preview will appear here.
                </div>
              )}
              {filteredLogs.map((l, i) => (
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

        {showNetwork && (
          <NetworkPanel entries={network} onClear={() => setNetwork([])} />
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
        Describe what you want on the left. Watch it render here — Monaco edit, live preview,
        console + network.
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
        Try: &quot;Design a hero for a rocket startup&quot;
      </div>
    </div>
  );
}
