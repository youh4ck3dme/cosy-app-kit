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
  Scaling,
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
import { latestSnippetForFile, type EditFileSnippet } from "@/lib/edit-snippets";
import {
  computeFrame,
  defaultPreviewModeForHost,
  formatFrameBadge,
  isPreviewMode,
  migrateLegacyDevice,
  type PreviewMode,
} from "@/lib/preview-frame";
import { analyzeResponsiveHtml, type ResponsiveReport } from "@/lib/agent/responsive-gate";
import {
  analyzeProjectRuntime,
  isMultiPageProject,
  type ProjectRuntimeReport,
} from "@/lib/agent/project-runtime-gate";
import { validateProject } from "@/lib/agent/project-validate";
import { needsUrlPreview } from "@/lib/project-fs";
import { buildProjectPreviewUrl } from "@/lib/project-preview-url";
import { mintPreviewToken } from "@/lib/preview-token.functions";
import { buildPreviewBridgeScript } from "@/lib/preview-bridge";
import { resolvePreviewNavTarget } from "@/lib/preview-nav";
import { injectScriptIntoHtmlHead } from "@/lib/preview-storage-polyfill";

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

type View = "preview" | "code" | "diff";
type ConsoleEntry = { level: "log" | "warn" | "error"; args: string[]; ts: number };
type ConsoleFilter = "all" | "log" | "warn" | "error";

/** Build a chat prompt from live preview console errors (magic wand). */
export function buildConsoleFixPrompt(
  logs: ConsoleEntry[],
  opts?: { fileHint?: string | null; networkFails?: string[] },
): string {
  const errors = logs.filter((l) => l.level === "error").slice(-12);
  const warns = logs.filter((l) => l.level === "warn").slice(-6);
  const lines: string[] = [
    "Build mode. Fix the current canvas artifact (prefer edit_file on the open HTML file).",
    "Preview console reported runtime issues — keep brand and layout, only fix the bugs.",
    "",
  ];
  if (opts?.fileHint) {
    lines.push(`Primary file: ${opts.fileHint}`);
    lines.push("");
  }
  if (errors.length) {
    lines.push("Errors:");
    for (const e of errors) {
      lines.push(`- ${e.args.join(" ").slice(0, 280)}`);
    }
    lines.push("");
  }
  if (warns.length) {
    lines.push("Warnings:");
    for (const w of warns) {
      lines.push(`- ${w.args.join(" ").slice(0, 200)}`);
    }
    lines.push("");
  }
  if (opts?.networkFails?.length) {
    lines.push("Failed network requests:");
    for (const n of opts.networkFails.slice(-8)) {
      lines.push(`- ${n}`);
    }
    lines.push("");
  }
  lines.push(
    "After fixes, ensure: no uncaught JS errors, mobile sidebar works, localStorage in try/catch.",
  );
  return lines.join("\n");
}

/**
 * Sandboxed iframe uses srcDoc (opaque origin "null") so postMessage target is "*".
 * Authenticate with a per-mount random token + event.source === iframe.contentWindow.
 *
 * Do NOT add allow-same-origin to sandbox — untrusted agent HTML must not share parent origin.
 * Instead we polyfill localStorage/sessionStorage in-memory so dashboards don't SecurityError.
 */
function injectBridge(html: string, token: string): string {
  // Polyfill MUST run before artifact scripts (localStorage in init).
  return injectScriptIntoHtmlHead(html, buildPreviewBridgeScript(token));
}

function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

/** Short chip label for multi-page HTML (index.html → Home). */
function htmlPageLabel(path: string): string {
  const base = path.split("/").pop() ?? path;
  const stem = base.replace(/\.html?$/i, "");
  if (!stem || stem === "index") return "Home";
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

function fileList(a: Artifact): ArtifactFile[] {
  if (a.files && a.files.length > 0) return a.files;
  const path =
    a.kind === "html" ? "index.html" : a.kind === "markdown" ? "README.md" : "artifact.txt";
  return [{ path, language: a.kind, content: a.content }];
}

function deviceStorageKey(threadId?: string) {
  return threadId ? `builder:device:${threadId}` : "builder:device:global";
}

export function Canvas({
  artifact,
  threadId,
  editSnippets = [],
  onPolishMobile,
  onPolishProject,
  onFixFromConsole,
}: {
  artifact?: Artifact;
  threadId?: string;
  /** From chat tool parts — enables Diff “Show model change”. */
  editSnippets?: EditFileSnippet[];
  /** One-tap “Make mobile-first” → parent sends polish prompt (MR-40 M3). */
  onPolishMobile?: () => void;
  /** One-tap multi-file project runtime fix (FleetOps-class ZIP readiness). */
  onPolishProject?: () => void;
  /**
   * Magic wand: parent fills composer (or auto-sends) with a fix prompt built from
   * live preview console errors. Prefer fill-composer so user can edit before send.
   */
  onFixFromConsole?: (prompt: string) => void;
}) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => defaultPreviewModeForHost());
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<View>("preview");
  const [activeFile, setActiveFile] = useState<string | null>(null);
  /** Which HTML file the preview iframe is showing (multi-file nav). */
  const [previewPath, setPreviewPath] = useState<string | null>(null);
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
  /** Width of the scrollable canvas host (for fluid + fit scale). */
  const [hostWidth, setHostWidth] = useState<number>(() =>
    typeof window !== "undefined" ? Math.min(window.innerWidth, 1200) : 800,
  );
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);
  /** Per-mount token so we ignore console/network spam from other frames. */
  const bridgeTokenRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const share = useServerFn(setArtifactPublic);
  const saveFiles = useServerFn(updateArtifactFiles);
  const mintToken = useServerFn(mintPreviewToken);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [deviceHydrated, setDeviceHydrated] = useState(false);
  const responsiveToastFor = useRef<string | null>(null);
  const projectToastFor = useRef<string | null>(null);
  /** Skip artifact-reset setState storm on initial mount / Strict Mode remount. */
  const prevArtifactIdRef = useRef<string | null | undefined>(undefined);
  const navCtxRef = useRef({
    entryPath: null as string | null,
    resolvedPreviewPath: null as string | null,
    filePaths: [] as string[],
    useUrlPreview: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(deviceStorageKey(threadId));
      if (!raw) {
        setPreviewMode(defaultPreviewModeForHost());
        setCustomWidth(null);
      } else {
        const parsed = JSON.parse(raw) as {
          mode?: string;
          device?: string;
          customWidth?: number | null;
        };
        if (isPreviewMode(parsed.mode)) {
          setPreviewMode(parsed.mode);
        } else {
          const legacy = migrateLegacyDevice(parsed.device);
          setPreviewMode(legacy ?? defaultPreviewModeForHost());
        }
        if (typeof parsed.customWidth === "number") setCustomWidth(parsed.customWidth);
      }
    } catch {
      setPreviewMode(defaultPreviewModeForHost());
    }
    setDeviceHydrated(true);
  }, [threadId]);

  useEffect(() => {
    if (!deviceHydrated) return;
    try {
      localStorage.setItem(
        deviceStorageKey(threadId),
        JSON.stringify({ mode: previewMode, customWidth }),
      );
    } catch {
      /* ignore */
    }
  }, [previewMode, customWidth, threadId, deviceHydrated]);

  // Host width for fluid + scale-to-fit simulation
  useEffect(() => {
    const el = paneRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w !== "number" || w <= 0) return;
      const next = Math.round(w);
      setHostWidth((prev) => (prev === next ? prev : next));
    });
    ro.observe(el);
    const initial = Math.round(el.clientWidth);
    if (initial > 0) setHostWidth((prev) => (prev === initial ? prev : initial));
    return () => ro.disconnect();
  }, []);

  const rawFiles = artifact ? fileList(artifact) : [];
  const files = rawFiles.map((f) => ({ ...f, content: edits[f.path] ?? f.content }));
  const htmlFiles = files.filter((f) => isHtmlPath(f.path));
  const multiPage = htmlFiles.length > 1;
  const isDirty = Object.keys(edits).length > 0;
  const filePathsKey = rawFiles.map((f) => f.path).join("\0");
  const filePaths = useMemo(() => (filePathsKey ? filePathsKey.split("\0") : []), [filePathsKey]);
  const entryPath =
    (artifact?.entry_path && files.some((f) => f.path === artifact.entry_path)
      ? artifact.entry_path
      : null) ??
    files.find((f) => isHtmlPath(f.path))?.path ??
    files[0]?.path ??
    null;
  const resolvedPreviewPath =
    (previewPath && files.some((f) => f.path === previewPath) ? previewPath : null) ?? entryPath;
  const useUrlPreview = Boolean(artifact && needsUrlPreview(files));
  navCtxRef.current = { entryPath, resolvedPreviewPath, filePaths, useUrlPreview };
  const currentFile =
    files.find((f) => f.path === activeFile) ??
    files.find((f) => f.path === resolvedPreviewPath) ??
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

  const iframeBaseHeight = useMemo(() => {
    if (typeof window === "undefined") return 720;
    const vh = window.innerHeight;
    if (fullscreen) return Math.max(480, vh - 120);
    // Fill more of the canvas on short phone viewports; keep desktop roomy.
    if (vh < 720) return Math.max(360, vh - 200);
    return 720;
  }, [fullscreen, hostWidth]);

  const frame = useMemo(() => {
    // Narrow hosts: less chrome padding so fluid ≈ true device width.
    const pad = hostWidth < 640 ? 12 : 32;
    return computeFrame({
      mode: previewMode,
      hostWidth: Math.max(280, hostWidth - pad),
      zoom,
      customWidth,
      iframeHeight: iframeBaseHeight,
    });
  }, [previewMode, hostWidth, zoom, customWidth, iframeBaseHeight]);

  const srcDoc = useMemo(() => {
    if (!artifact || !resolvedPreviewPath) return null;
    if (useUrlPreview) return null;
    const entry = files.find((f) => f.path === resolvedPreviewPath);
    if (!entry) return null;
    if (artifact.kind === "html" || isHtmlPath(entry.path)) {
      return injectBridge(entry.content, bridgeTokenRef.current);
    }
    return null;
  }, [artifact, files, resolvedPreviewPath, useUrlPreview]);

  useEffect(() => {
    if (!artifact?.id || !useUrlPreview) {
      setPreviewToken(null);
      return;
    }
    if (artifact.is_public) {
      setPreviewToken(null);
      return;
    }
    let cancelled = false;
    mintToken({ data: { artifactId: artifact.id } })
      .then((r) => {
        if (!cancelled) setPreviewToken(r.token);
      })
      .catch(() => {
        if (!cancelled) setPreviewToken(null);
      });
    return () => {
      cancelled = true;
    };
  }, [artifact?.id, artifact?.is_public, useUrlPreview, filePathsKey, mintToken]);

  const previewSrc = useMemo(() => {
    if (!artifact || !resolvedPreviewPath || !useUrlPreview) return null;
    if (!artifact.is_public && !previewToken) return null;
    return buildProjectPreviewUrl({
      artifactId: artifact.id,
      entryPath: resolvedPreviewPath,
      token: artifact.is_public ? null : previewToken,
      bridgeToken: bridgeTokenRef.current,
    });
  }, [artifact, resolvedPreviewPath, useUrlPreview, previewToken, key]);

  const hasLivePreview = Boolean(srcDoc || previewSrc);

  const entryHtml = useMemo(() => {
    if (!artifact || !resolvedPreviewPath) return null;
    const entry = files.find((f) => f.path === resolvedPreviewPath);
    if (!entry) return null;
    if (artifact.kind === "html" || isHtmlPath(entry.path)) return entry.content;
    return null;
  }, [artifact, files, resolvedPreviewPath]);

  const responsiveReport: ResponsiveReport | null = useMemo(() => {
    if (!entryHtml) return null;
    return analyzeResponsiveHtml(entryHtml);
  }, [entryHtml]);

  const projectReport: ProjectRuntimeReport | null = useMemo(() => {
    if (!artifact || files.length < 2) return null;
    if (!isMultiPageProject(files)) return null;
    return analyzeProjectRuntime(files.map((f) => ({ path: f.path, content: f.content })));
  }, [artifact, files]);

  useEffect(() => {
    if (!artifact?.id || !responsiveReport || responsiveReport.ok) return;
    if (responsiveToastFor.current === artifact.id) return;
    responsiveToastFor.current = artifact.id;
    toast.message(`Mobile score ${responsiveReport.score}/100`, {
      description: responsiveReport.hints[0] ?? "Layout may not be mobile-friendly.",
      duration: 4500,
    });
  }, [artifact?.id, responsiveReport]);

  useEffect(() => {
    if (!artifact?.id || !projectReport || projectReport.ok) return;
    if (projectToastFor.current === artifact.id) return;
    projectToastFor.current = artifact.id;
    toast.message(`Project ZIP score ${projectReport.score}/100`, {
      description:
        projectReport.hints[0] ??
        projectReport.hardFails[0] ??
        "Multi-file package may fail acceptance / offline export.",
      duration: 5500,
    });
  }, [artifact?.id, projectReport]);

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
        f.path === currentFile.path
          ? originalCurrent
          : { ...f, content: nextEdits[f.path] ?? f.content },
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

  const selectHtmlPage = (path: string) => {
    setActiveFile(path);
    if (!isHtmlPath(path)) return;
    setPreviewPath(path);
    setLogs([]);
    setNetwork([]);
    bridgeTokenRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setKey((k) => k + 1);
  };

  useEffect(() => {
    const id = artifact?.id ?? null;
    // Initial mount (incl. Strict Mode remount with same id): do not reset / bump iframe key.
    if (prevArtifactIdRef.current === undefined) {
      prevArtifactIdRef.current = id;
      return;
    }
    if (prevArtifactIdRef.current === id) return;
    prevArtifactIdRef.current = id;
    setActiveFile(null);
    setPreviewPath(null);
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
      const allowed =
        d.__builder_navigate === token ||
        d.__builder_console === token ||
        d.__builder_network === token;
      if (!allowed) return;
      // URL-mode multi-file: ignore navigate (browser handles relative HTML).
      if (d.__builder_navigate === token && typeof d.href === "string") {
        if (navCtxRef.current.useUrlPreview) return;
        const { entryPath: ep, resolvedPreviewPath: rp, filePaths: fps } = navCtxRef.current;
        const current = rp ?? ep ?? "index.html";
        const target = resolvePreviewNavTarget(d.href, {
          filePaths: fps,
          currentPath: current,
        });
        if (target.kind === "internal") {
          setPreviewPath(target.path);
          setActiveFile(target.path);
          setLogs([]);
          setNetwork([]);
          bridgeTokenRef.current =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setKey((k) => k + 1);
        }
        return;
      }
      if (d.__builder_console === token) {
        const level: ConsoleEntry["level"] =
          d.level === "error" || d.level === "warn" || d.level === "log" ? d.level : "log";
        const args = Array.isArray(d.args)
          ? d.args.map((a: unknown) => (typeof a === "string" ? a : String(a)))
          : [String(d.args ?? "")];
        setLogs((prev) => [...prev.slice(-199), { level, args, ts: Date.now() }]);
        // Surface real runtime failures immediately
        if (level === "error") setShowConsole(true);
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
            prev.map((row) => (row.id === d.id ? { ...row, status: d.status, ms: d.ms } : row)),
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
      if ((e.key === "f" || e.key === "F") && hasLivePreview && view === "preview") {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, hasLivePreview, view]);

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
      const result = await exportArtifactDownload(artifact, files);
      const validation = validateProject(
        files.map((f) => ({ path: f.path, content: f.content })),
        { entryPath: artifact.entry_path },
      );
      if (result.mode === "zip") {
        if (validation.status !== "pass" || !result.report.ok) {
          toast.message("Draft export — validation failed", {
            description:
              validation.checks.find((c) => c.status === "fail")?.evidence ??
              result.report.hints[0] ??
              `Project score ${result.report.score}/100 — not production-ready.`,
            duration: 7000,
          });
        } else {
          toast.success(`ZIP ready · ${result.fileCount} files · score ${result.report.score}`);
        }
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const filteredLogs =
    consoleFilter === "all" ? logs : logs.filter((l) => l.level === consoleFilter);
  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;
  const networkFails = network
    .filter((n) => n.status === 0 || (typeof n.status === "number" && n.status >= 400))
    .map((n) => `${n.method} ${n.url} → ${n.status ?? "?"}`);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[color-mix(in_oklab,var(--color-background)_94%,black)]",
        fullscreen && "fixed inset-0 z-50 bg-background",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-fade opacity-70"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-glow opacity-40" />

      {/* Single scrollable chrome row — never overflows Builder shell on phones */}
      <div className="relative z-10 flex flex-none min-w-0 border-b border-border-subtle glass">
        <div className="flex min-h-11 w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain no-scrollbar px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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

            {view === "preview" && hasLivePreview && (
              <>
                <div className="hidden h-4 w-px bg-border-subtle sm:block" />
                {/* M1: fluid + real device sim (scale) — visible on phone too */}
                <div
                  className="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-1/70 p-0.5"
                  role="group"
                  aria-label="Preview device width"
                >
                  {(
                    [
                      { mode: "fluid" as const, Icon: Scaling, label: "Fluid (host width)" },
                      { mode: "mobile" as const, Icon: Smartphone, label: "Mobile 390" },
                      { mode: "tablet" as const, Icon: Tablet, label: "Tablet 768" },
                      { mode: "desktop" as const, Icon: Monitor, label: "Desktop 1200" },
                    ] as const
                  ).map(({ mode, Icon, label }) => {
                    const active = previewMode === mode && !customWidth;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setCustomWidth(null);
                          setPreviewMode(mode);
                        }}
                        className={cn(
                          "flex min-h-9 min-w-9 items-center justify-center rounded-md p-1.5 transition-all",
                          active
                            ? "bg-surface-3 text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={label}
                        aria-label={label}
                        aria-pressed={active}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>
                <label className="hidden items-center gap-1 font-mono text-[10px] text-muted-foreground md:flex">
                  px
                  <input
                    id="preview-custom-width"
                    name="preview-custom-width"
                    type="number"
                    min={280}
                    max={1600}
                    value={customWidth ?? ""}
                    placeholder={String(frame.mediaWidth)}
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

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            {view === "preview" && hasLivePreview && (
              <div className="hidden items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 text-xs font-mono text-muted-foreground md:flex">
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
            {artifact && hasLivePreview && (
              <>
                <button
                  onClick={() => {
                    setShowConsole((s) => !s);
                    if (!showConsole) setShowNetwork(false);
                  }}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors sm:px-2",
                    showConsole
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                  title={
                    errorCount
                      ? `Console — ${errorCount} error(s) from preview`
                      : "Console — live logs from sandboxed preview"
                  }
                  aria-label="Toggle console"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Console</span>
                  {errorCount > 0 ? (
                    <span className="rounded-full bg-destructive/20 px-1.5 text-[10px] font-mono text-destructive tabular-nums">
                      {errorCount}
                    </span>
                  ) : logs.length > 0 ? (
                    <span className="rounded-full bg-accent-primary/20 px-1.5 text-[10px] font-mono text-accent-primary tabular-nums">
                      {logs.length}
                    </span>
                  ) : null}
                </button>
                <button
                  onClick={() => {
                    setShowNetwork((s) => !s);
                    if (!showNetwork) setShowConsole(false);
                  }}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors sm:px-2",
                    showNetwork
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                  title="Network"
                  aria-label="Toggle network panel"
                >
                  <Network className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Net</span>
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
                    "inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors sm:px-2",
                    artifact.is_public
                      ? "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                  )}
                  title={artifact.is_public ? "Public — click to unshare" : "Share publicly"}
                  aria-label={artifact.is_public ? "Disable public share" : "Share publicly"}
                >
                  {artifact.is_public ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden md:inline">{artifact.is_public ? "Shared" : "Share"}</span>
                </button>
              </>
            )}
            {artifact?.kind === "html" && hasLivePreview && (
              <button
                onClick={() => {
                  if (previewSrc) {
                    window.open(previewSrc, "_blank");
                    return;
                  }
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.open();
                    w.document.write(srcDoc ?? "");
                    w.document.close();
                  }
                }}
                className="hidden min-h-9 min-w-9 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground sm:inline-flex"
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {artifact && multiPage && view === "preview" && (
        <div
          className="relative z-10 flex flex-none items-center gap-2 overflow-x-auto border-b border-border-subtle bg-surface-1/40 px-2 py-1.5 no-scrollbar"
          role="navigation"
          aria-label="Preview pages"
        >
          <span className="shrink-0 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {htmlFiles.length} pages
          </span>
          <label className="flex min-h-11 min-w-0 flex-1 items-center sm:hidden">
            <span className="sr-only">Select page</span>
            <select
              id="preview-page-select"
              name="preview-page"
              className="min-h-11 w-full rounded-md border border-border-subtle bg-surface-1 px-2 font-mono text-[12px] text-foreground"
              value={resolvedPreviewPath ?? htmlFiles[0]?.path ?? ""}
              onChange={(e) => selectHtmlPage(e.target.value)}
              aria-label="Select preview page"
            >
              {htmlFiles.map((f) => (
                <option key={f.path} value={f.path}>
                  {htmlPageLabel(f.path)} ({f.path})
                </option>
              ))}
            </select>
          </label>
          <div className="hidden min-w-0 flex-1 items-center gap-1 sm:flex">
            {htmlFiles.map((f) => {
              const active = f.path === resolvedPreviewPath;
              const edited = edits[f.path] !== undefined;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => selectHtmlPage(f.path)}
                  aria-pressed={active}
                  aria-label={`Preview ${f.path}`}
                  title={f.path}
                  className={cn(
                    "min-h-11 shrink-0 rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-colors",
                    active
                      ? "border-accent-primary/50 bg-accent-primary/15 text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border-subtle hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {htmlPageLabel(f.path)}
                  {edited && <span className="ml-1.5 text-accent-primary">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {artifact && (view === "code" || view === "diff") && files.length > 1 && (
        <div className="relative z-10 flex flex-none items-center gap-0.5 overflow-x-auto border-b border-border-subtle bg-surface-1/40 px-2 no-scrollbar">
          {multiPage && (
            <span className="shrink-0 px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
              {htmlFiles.length} pages
            </span>
          )}
          {files.map((f) => {
            const active = currentFile?.path === f.path;
            const edited = edits[f.path] !== undefined;
            return (
              <button
                key={f.path}
                type="button"
                onClick={() => {
                  if (isHtmlPath(f.path)) {
                    selectHtmlPage(f.path);
                  } else {
                    setActiveFile(f.path);
                  }
                }}
                aria-pressed={active}
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
        <div
          ref={paneRef}
          className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto overscroll-contain p-2 sm:p-4 lg:p-8"
        >
          {!artifact && <EmptyCanvas />}

          {artifact && view === "preview" && hasLivePreview && (
            <div
              className="flex-none animate-in-scale"
              style={{
                width: frame.outerWidth,
                height: 32 + frame.outerIframeHeight,
                maxWidth: "100%",
              }}
            >
              {/*
                Outer size = scaled footprint. Inner keeps full mediaWidth so
                iframe CSS media queries see desktop/tablet targets (M1).
              */}
              <div
                className="overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-elevated"
                style={{
                  width: frame.mediaWidth,
                  height: 32 + frame.iframeHeight,
                  transform: `scale(${frame.scale})`,
                  transformOrigin: "top left",
                }}
              >
                <div className="flex h-8 items-center gap-1.5 border-b border-border-subtle bg-surface-1/60 px-3">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.20_25)]/50" />
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.80_0.16_85)]/50" />
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.18_150)]/50" />
                  <div className="ml-3 flex min-w-0 flex-1 items-center gap-2 truncate">
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {artifact.title}
                    </span>
                    {responsiveReport && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums",
                          responsiveReport.ok
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-300",
                        )}
                        title={
                          responsiveReport.hints[0] ??
                          (responsiveReport.ok ? "Responsive gate OK" : "Responsive gate warnings")
                        }
                      >
                        m{responsiveReport.score}
                      </span>
                    )}
                    {projectReport && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums",
                          projectReport.ok
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-amber-500/15 text-amber-300",
                        )}
                        title={
                          projectReport.hints[0] ??
                          (projectReport.ok
                            ? "Project ZIP runtime OK"
                            : projectReport.hardFails.join(", ") || "Project runtime warnings")
                        }
                      >
                        p{projectReport.score}
                      </span>
                    )}
                    {onPolishMobile && entryHtml && (
                      <button
                        type="button"
                        onClick={onPolishMobile}
                        className={cn(
                          "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors",
                          responsiveReport && !responsiveReport.ok
                            ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                            : "bg-surface-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                        )}
                        title="Ask Builder to rewrite layout mobile-first"
                      >
                        Mobile-first
                      </button>
                    )}
                    {onPolishProject && projectReport && !projectReport.ok && (
                      <button
                        type="button"
                        onClick={onPolishProject}
                        className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/30"
                        title="Ask Builder to fix multi-file project runtime for ZIP export"
                      >
                        Fix project
                      </button>
                    )}
                  </div>
                  <span
                    className="shrink-0 font-mono text-[10px] text-muted-foreground/60 tabular-nums"
                    title={
                      frame.simulated
                        ? `Simulated ${frame.mode}: media queries see ${frame.mediaWidth}px, scaled ×${frame.fitScale.toFixed(2)} to fit host`
                        : `Media width ${frame.mediaWidth}px (${frame.mode})`
                    }
                  >
                    {formatFrameBadge(frame)}
                    {frame.simulated ? " sim" : ""}
                  </span>
                </div>
                {/*
                  Sandbox: scripts+forms only — no same-origin, no top-nav, no downloads.
                  Preview is untrusted user/agent HTML; keep capabilities minimal.
                */}
                <iframe
                  key={key}
                  ref={iframeRef}
                  {...(previewSrc
                    ? { src: previewSrc }
                    : srcDoc
                      ? { srcDoc }
                      : {})}
                  sandbox="allow-scripts allow-forms"
                  className="block w-full border-0 bg-white"
                  style={{ height: frame.iframeHeight, width: frame.mediaWidth }}
                  title={artifact.title}
                />
              </div>
            </div>
          )}

          {artifact && view === "preview" && !hasLivePreview && artifact.kind === "markdown" && (
            <article
              className="prose prose-invert prose-sm w-full max-w-3xl rounded-2xl border border-border-subtle bg-panel px-4 py-5 shadow-elevated animate-in-scale sm:px-8 sm:py-6"
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
                  {previewSrc ? (
                    <iframe
                      src={previewSrc}
                      sandbox="allow-scripts allow-forms"
                      className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
                      title="Share preview"
                      tabIndex={-1}
                    />
                  ) : srcDoc ? (
                    <iframe
                      srcDoc={srcDoc}
                      // Same as main preview — empty sandbox logs "allow-scripts is not set"
                      // and confuses debugging (thumbnail is pointer-events-none only).
                      sandbox="allow-scripts allow-forms"
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
                {onFixFromConsole &&
                  (errorCount > 0 || warnCount > 0 || networkFails.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        const prompt = buildConsoleFixPrompt(logs, {
                          fileHint: resolvedPreviewPath ?? artifact?.entry_path ?? "index.html",
                          networkFails,
                        });
                        onFixFromConsole(prompt);
                        toast.message("Fix prompt ready in chat", {
                          description: "Review and send — Build mode preferred",
                        });
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-2 py-0.5 text-[11px] font-medium text-accent-primary hover:bg-accent-primary/20"
                      title="Fill chat with a prompt to fix these console errors"
                      aria-label="Suggest fix prompt from console errors"
                    >
                      <Wand2 className="h-3 w-3" aria-hidden />
                      Fix in chat
                    </button>
                  )}
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
                  Live preview console — JS errors, warns, and logs from the sandboxed iframe appear
                  here (not mocked).
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

        {showNetwork && <NetworkPanel entries={network} onClear={() => setNetwork([])} />}
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
        Describe what you want in Chat. Watch it render here — live preview, Monaco edit, console +
        network. On mobile, switch with Chat | Preview in the header.
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
