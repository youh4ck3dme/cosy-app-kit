import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import {
  createThread,
  getThread,
  truncateThreadMessagesAfter,
  updateThreadModel,
} from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/app-shell/Header";
import { ThreadList } from "@/components/app-shell/ThreadList";
import { Canvas, type Artifact } from "@/components/app-shell/Canvas";
import {
  Composer,
  type BuilderMode,
  type ComposerFillRequest,
} from "@/components/app-shell/Composer";
import { MessageList } from "@/components/app-shell/MessageList";
import { AppDialog } from "@/components/app-shell/AppDialog";
import { AgentSettingsPanel } from "@/components/app-shell/AgentSettingsPanel";
import { CommandPalette, ShortcutsHelp } from "@/components/app-shell/CommandPalette";
import { Tour } from "@/components/onboarding/Tour";
import { useHotkey } from "@/hooks/use-hotkeys";
import { useAppViewportLock } from "@/hooks/use-app-viewport-lock";
import { userFacingChatError } from "@/lib/agent/error-handling";
import { exportArtifactDownload } from "@/lib/export-artifact";
import { truncateThreadMessagesClient } from "@/lib/truncate-messages";
import { extractEditFileSnippets } from "@/lib/edit-snippets";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MOBILE_FIRST_POLISH_PROMPT } from "@/lib/agent/prompts";
import { isPreviewMode, type PreviewMode } from "@/lib/preview-frame";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
  head: ({ params }) => ({
    meta: [
      { title: `Chat · Builder` },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: `Private Builder thread ${params.threadId}` },
    ],
  }),
  errorComponent: ChatErrorBoundary,
  notFoundComponent: ChatNotFound,
});

function ChatErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Chat failed to load</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Retry
        </button>
        <Link to="/chat" className="rounded-md border border-border px-4 py-2 text-sm">
          All chats
        </Link>
      </div>
    </div>
  );
}

function ChatNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">Thread not found</h1>
      <p className="text-sm text-muted-foreground">
        This chat does not exist or you do not have access.
      </p>
      <Link
        to="/chat"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Start a new chat
      </Link>
    </div>
  );
}

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  const qc = useQueryClient();
  const navigate = useNavigateSafe();
  const load = useServerFn(getThread);
  const updateModel = useServerFn(updateThreadModel);
  const create = useServerFn(createThread);
  const truncateMessages = useServerFn(truncateThreadMessagesAfter);
  useAppViewportLock(true);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => load({ data: { threadId } }),
  });

  const initialMessages: UIMessage[] = useMemo(() => {
    if (!data?.messages) return [];
    return data.messages.map((m) => ({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: (m.parts as unknown as UIMessage["parts"]) ?? [],
    }));
  }, [data]);

  const [showSettings, setShowSettings] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<"chat" | "preview">("chat");
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>("Build");
  const [composerFill, setComposerFill] = useState<ComposerFillRequest | null>(null);
  const fillComposer = useCallback((text: string, mode: "replace" | "quote" = "replace") => {
    setComposerFill({ id: Date.now(), text, mode });
    setView("chat");
  }, []);

  useEffect(() => {
    try {
      const seeded = sessionStorage.getItem("builder:template-prompt");
      if (!seeded) return;
      sessionStorage.removeItem("builder:template-prompt");
      fillComposer(seeded, "replace");
    } catch {
      /* ignore */
    }
  }, [fillComposer]);
  const modeRef = useRef<BuilderMode>("Build");
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data: sess } = await supabase.auth.getSession();
          const headers: Record<string, string> = {};
          if (sess.session) headers.Authorization = `Bearer ${sess.session.access_token}`;

          // MR-40 M3: host width + canvas preview mode (no PII)
          let previewMode: PreviewMode | undefined;
          try {
            const raw = localStorage.getItem(`builder:device:${threadId}`);
            if (raw) {
              const parsed = JSON.parse(raw) as { mode?: string };
              if (isPreviewMode(parsed.mode)) previewMode = parsed.mode;
            }
          } catch {
            /* ignore */
          }
          const hostWidth =
            typeof window !== "undefined" ? Math.round(window.innerWidth) : undefined;

          return {
            body: {
              threadId,
              messages,
              mode: modeRef.current === "Plan" ? "plan" : "build",
              clientContext: {
                hostWidth,
                previewMode,
              },
            },
            headers,
          };
        },
      }),
    [threadId],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    regenerate,
    error: chatError,
  } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const msg = userFacingChatError((err.message || "Chat request failed").trim());
      const sticky = /402|429|credits|rate limit|MISTRAL_API_KEY|mistral auth|quota/i.test(msg);
      toast.error(msg, { duration: sticky ? 10_000 : 5_000 });
    },
    onData: (part) => {
      // G1.3 transient stream data parts from /api/chat
      const p = part as { type?: string; data?: Record<string, unknown> };
      if (!p?.type || !p.data) return;
      if (p.type === "data-artifact-created") {
        const artifactId = typeof p.data.artifactId === "string" ? p.data.artifactId : null;
        const title = typeof p.data.title === "string" ? p.data.title : "Artifact";
        if (artifactId) setActiveArtifactId(artifactId);
        // Desktop: both panes visible; optional focus on preview tab state.
        // Mobile: do NOT auto-hide chat — stream + history must stay on screen.
        // User can tap Preview in the header when ready.
        if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
          setView("preview");
        }
        toast.success(`Created «${title}»`, {
          id: "artifact-created",
          description:
            typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
              ? "Tap Preview in the header (Chat | Preview)"
              : undefined,
        });
        qc.invalidateQueries({ queryKey: ["thread", threadId] });
      } else if (p.type === "data-memory-saved") {
        const key = typeof p.data.key === "string" ? p.data.key : "preference";
        toast.success(`Remembered: ${key}`, { id: "memory-saved" });
      } else if (p.type === "data-plan") {
        const goal = typeof p.data.goal === "string" ? p.data.goal : "Plan ready";
        toast.message(goal, { id: "plan-ready", description: "Structured plan from Plan mode" });
      }
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  // Early canvas refresh while tools complete mid-stream.
  const toolDoneSignature = useMemo(() => {
    return messages
      .flatMap((m) => m.parts ?? [])
      .filter(
        (p) =>
          typeof p === "object" &&
          p &&
          typeof (p as { type?: string }).type === "string" &&
          String((p as { type: string }).type).startsWith("tool-") &&
          (p as { state?: string }).state === "output-available",
      )
      .map((p) => (p as { toolCallId?: string }).toolCallId ?? "")
      .join("|");
  }, [messages]);

  useEffect(() => {
    if (!toolDoneSignature) return;
    qc.invalidateQueries({ queryKey: ["thread", threadId] });
  }, [toolDoneSignature, qc, threadId]);

  useEffect(() => {
    if (status !== "error" && !chatError) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const partErr = last?.parts?.find(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        "errorText" in p &&
        typeof (p as { errorText?: unknown }).errorText === "string" &&
        (p as { errorText: string }).errorText.trim(),
    ) as { errorText?: string } | undefined;
    const msg = (partErr?.errorText || chatError?.message || "").trim();
    if (!msg) return;
    const sticky = /402|429|credits|rate limit|MISTRAL_API_KEY|mistral auth|quota/i.test(msg);
    toast.error(userFacingChatError(msg), {
      duration: sticky ? 10_000 : 5_000,
      id: `chat-err-${threadId}`,
    });
  }, [status, chatError, messages, threadId]);

  const artifacts = useMemo(() => (data?.artifacts ?? []) as Artifact[], [data?.artifacts]);
  useEffect(() => {
    if (!activeArtifactId && artifacts.length > 0) setActiveArtifactId(artifacts[0].id);
  }, [artifacts, activeArtifactId]);
  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0];

  const editSnippets = useMemo(() => extractEditFileSnippets(messages), [messages]);

  // Intentionally no auto setView("preview") when artifacts load on mobile —
  // that hid the entire chat column after build and looked like messages vanished.

  const handleModelChange = async (model: string) => {
    await updateModel({ data: { threadId, model } });
    qc.invalidateQueries({ queryKey: ["thread", threadId] });
    toast.success("Model updated for this chat");
  };

  const streaming = status === "submitted" || status === "streaming";

  const sendText = useCallback(
    (text: string, attachments?: { mediaType: string; url: string; name?: string }[]) => {
      if (attachments?.length) {
        void sendMessage({
          parts: [
            ...attachments.map((a) => ({
              type: "file" as const,
              mediaType: a.mediaType,
              url: a.url,
              filename: a.name,
            })),
            { type: "text" as const, text },
          ],
        });
      } else {
        void sendMessage({ text });
      }
    },
    [sendMessage],
  );

  const onRetryFrom = useCallback(
    async (messageId: string) => {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      try {
        await truncateThreadMessagesClient(truncateMessages, {
          threadId,
          messageId,
          messageIndex: idx,
          mode: "retry_assistant",
        });
      } catch {
        return;
      }
      setMessages(messages.slice(0, idx));
      void regenerate();
      void qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
    [messages, setMessages, regenerate, threadId, truncateMessages, qc],
  );

  const onEditUserMessage = useCallback(
    async (messageId: string, text: string) => {
      if (!text.trim()) return;
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      try {
        await truncateThreadMessagesClient(truncateMessages, {
          threadId,
          messageId,
          messageIndex: idx,
          mode: "edit_user",
        });
      } catch {
        return;
      }
      setMessages(messages.slice(0, idx));
      void sendMessage({ text });
      void qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
    [messages, setMessages, sendMessage, threadId, truncateMessages, qc],
  );

  useHotkey("mod+k", (e) => {
    e.preventDefault();
    setPaletteOpen(true);
  });
  useHotkey("mod+/", (e) => {
    e.preventDefault();
    setMode((m) => (m === "Build" ? "Plan" : "Build"));
  });
  useHotkey("mod+b", (e) => {
    e.preventDefault();
    setSidebarOpen((s) => !s);
  });
  useHotkey("mod+n", (e) => {
    e.preventDefault();
    void (async () => {
      const { id } = await create({ data: {} });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      navigate(`/chat/${id}`);
    })();
  });
  useHotkey(
    "?",
    (e) => {
      e.preventDefault();
      setShortcutsOpen(true);
    },
    { allowInInput: false },
  );
  useHotkey(
    "escape",
    (e) => {
      if (shortcutsOpen) {
        e.preventDefault();
        setShortcutsOpen(false);
        return;
      }
      if (paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
      }
    },
    { allowInInput: true },
  );

  if (isError) {
    throw error instanceof Error ? error : new Error("Failed to load thread");
  }

  return (
    <div className="fixed inset-0 z-0 flex h-dvh max-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <a
        href="#chat-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to chat
      </a>
      <Header
        activeThreadId={threadId}
        activeModel={data?.thread?.model}
        onModelChange={handleModelChange}
        onOpenSettings={() => setShowSettings(true)}
        view={view}
        onViewChange={setView}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden min-h-0 w-64 shrink-0 overflow-y-auto overscroll-y-contain border-r border-border md:block",
            !sidebarOpen && "md:hidden",
          )}
        >
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <ThreadList activeThreadId={threadId} />
          )}
        </aside>

        <section
          id="chat-main"
          className={cn(
            "flex min-h-0 w-full flex-col overflow-hidden border-r border-border md:w-[440px] lg:w-[520px] md:flex",
            view === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          {/* StickToBottom is the only vertical scroller in chat column. */}
          <StickToBottom
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            resize="smooth"
            initial="instant"
          >
            <StickToBottom.Content className="px-4 sm:px-6">
              {isLoading ? (
                <div className="space-y-4 pt-8">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className={cn("h-16 rounded-xl", i % 2 ? "ml-8" : "mr-8")} />
                  ))}
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  status={status}
                  onRegenerate={() => regenerate()}
                  onRetryFrom={onRetryFrom}
                  onEditUserMessage={onEditUserMessage}
                  errorBanner={chatError?.message}
                  onPickPrompt={(p) => fillComposer(p, "replace")}
                  onFillComposer={(p) => fillComposer(p, "replace")}
                  onQuote={(text) => fillComposer(text, "quote")}
                  onFocusCanvas={() => {
                    setView("preview");
                    if (artifacts[0]) setActiveArtifactId(artifacts[0].id);
                  }}
                />
              )}
            </StickToBottom.Content>
            <JumpToLatest />
          </StickToBottom>
          <div className="flex-none overscroll-none border-t border-border-subtle bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md sm:px-4 supports-backdrop-filter:bg-background/85">
            <Composer
              onSend={({ text, attachments }) => sendText(text, attachments)}
              disabled={streaming}
              streaming={streaming}
              mode={mode}
              onModeChange={setMode}
              fillRequest={composerFill}
            />
          </div>
        </section>

        <section
          className={cn(
            "min-h-0 flex-1 flex-col overflow-hidden md:flex",
            view === "preview" ? "flex" : "hidden md:flex",
          )}
        >
          {artifacts.length > 1 && (
            <div className="flex flex-none items-center gap-1.5 overflow-x-auto border-b border-border px-3 py-2 no-scrollbar">
              {artifacts.map((a) => {
                const active = a.id === activeArtifact?.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActiveArtifactId(a.id)}
                    className={cn(
                      "min-h-11 shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
                      active
                        ? "border-border bg-elevated text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-surface hover:text-foreground",
                    )}
                  >
                    {a.title}
                  </button>
                );
              })}
            </div>
          )}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Skeleton className="h-[60%] w-[80%] rounded-2xl" />
            </div>
          ) : (
            <Canvas
              artifact={activeArtifact}
              threadId={threadId}
              editSnippets={editSnippets}
              onPolishMobile={() => {
                // One-tap mobile-first rewrite (MR-40 M3)
                setMode("Build");
                void sendMessage({ text: MOBILE_FIRST_POLISH_PROMPT });
                setView("preview");
              }}
            />
          )}
        </section>
      </div>

      <AppDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Agent settings"
        description="Configure model, temperature, system prompt, and tools."
      >
        <AgentSettingsPanel threadId={threadId} />
      </AppDialog>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        activeThreadId={threadId}
        mode={mode}
        onToggleMode={() => setMode((m) => (m === "Build" ? "Plan" : "Build"))}
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onPickStarter={(prompt) => sendText(prompt)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        activeArtifact={activeArtifact}
        onExportArtifact={activeArtifact ? () => exportArtifactDownload(activeArtifact) : undefined}
      />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Tour enabled={!isLoading} />
    </div>
  );
}

function JumpToLatest() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      className="absolute bottom-3 left-1/2 z-20 inline-flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-subtle bg-panel/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-elevated backdrop-blur hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Jump to latest messages"
    >
      <ArrowDown className="h-3.5 w-3.5" aria-hidden />
      Latest
    </button>
  );
}

function useNavigateSafe() {
  const router = useRouter();
  return (path: string) => {
    void router.navigate({ to: path });
  };
}
