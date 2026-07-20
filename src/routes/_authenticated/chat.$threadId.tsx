import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { getThread, listThreads, updateThreadModel } from "@/lib/threads.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useCreateThread } from "@/hooks/use-thread-mutations";
import { CommandPalette } from "@/components/app-shell/CommandPalette";
import { ShortcutsDialog } from "@/components/app-shell/ShortcutsDialog";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/app-shell/Header";
import { ThreadList } from "@/components/app-shell/ThreadList";
import { Canvas, type Artifact } from "@/components/app-shell/Canvas";
import { Composer, type BuilderMode } from "@/components/app-shell/Composer";
import { MessageList } from "@/components/app-shell/MessageList";
import { AppDialog } from "@/components/app-shell/AppDialog";
import { cn } from "@/lib/utils";

// Settings are rarely opened — keep the panel out of the main chunk.
const AgentSettingsPanel = lazy(() =>
  import("@/components/app-shell/AgentSettingsPanel").then((m) => ({
    default: m.AgentSettingsPanel,
  })),
);

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const load = useServerFn(getThread);
  const updateModel = useServerFn(updateThreadModel);

  const { data, isLoading } = useQuery({
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
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [view, setView] = useState<"chat" | "preview">("chat");
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>("Build");
  const modeRef = useRef<BuilderMode>("Build");
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const isMobile = useIsMobile();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data: sess } = await supabase.auth.getSession();
          const headers: Record<string, string> = {};
          if (sess.session) headers.Authorization = `Bearer ${sess.session.access_token}`;
          return {
            body: {
              threadId,
              messages,
              mode: modeRef.current === "Plan" ? "plan" : "build",
            },
            headers,
          };
        },
      }),
    [threadId],
  );

  const {
    messages,
    sendMessage,
    status,
    regenerate,
    error: chatError,
  } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const msg = (err.message || "Chat request failed").trim();
      // Gateway errors (402 credits, 429 rate limit, bad key) are already humanized by
      // formatAiGatewayError on the server — show them for longer so they're actionable.
      const sticky = /402|429|credits|rate limit|MISTRAL_API_KEY|mistral auth|quota/i.test(msg);
      toast.error(msg, { duration: sticky ? 10_000 : 5_000 });
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  // Some stream failures land as errorText on the last assistant part without firing onError.
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
    toast.error(msg, { duration: sticky ? 10_000 : 5_000, id: `chat-err-${threadId}` });
  }, [status, chatError, messages, threadId]);

  const artifacts = (data?.artifacts ?? []) as Artifact[];
  useEffect(() => {
    if (!activeArtifactId && artifacts.length > 0) setActiveArtifactId(artifacts[0].id);
  }, [artifacts, activeArtifactId]);
  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0];

  // Switch to preview automatically the first time an artifact appears on mobile
  const artifactCount = artifacts.length;
  useEffect(() => {
    if (artifactCount > 0 && isMobile) {
      setView("preview");
    }
    // Only react to the artifact count — a later viewport resize shouldn't hijack the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactCount]);

  // Global keyboard shortcuts + command palette
  const listThreadsFn = useServerFn(listThreads);
  const { data: threadListData } = useQuery({
    queryKey: ["threads"],
    queryFn: () => listThreadsFn(),
  });
  const createThreadMutation = useCreateThread();
  const focusComposer = () => {
    document.querySelector<HTMLTextAreaElement>("[data-composer] textarea")?.focus();
  };
  const goToSiblingThread = (dir: -1 | 1) => {
    const threads = (threadListData ?? []) as { id: string }[];
    const idx = threads.findIndex((t) => t.id === threadId);
    const next = threads[idx + dir];
    if (next) navigate({ to: "/chat/$threadId", params: { threadId: next.id } });
  };
  useGlobalShortcuts({
    onCommandPalette: () => setShowPalette((v) => !v),
    onNewChat: () => createThreadMutation.mutate(),
    onFocusComposer: () => {
      setView("chat");
      focusComposer();
    },
    onToggleView: () => setView((v) => (v === "chat" ? "preview" : "chat")),
    onPrevThread: () => goToSiblingThread(-1),
    onNextThread: () => goToSiblingThread(1),
    onShowShortcuts: () => setShowShortcuts(true),
  });

  const handleModelChange = async (model: string) => {
    await updateModel({ data: { threadId, model } });
    qc.invalidateQueries({ queryKey: ["thread", threadId] });
    toast.success("Model updated for this chat");
  };

  const streaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header
        activeThreadId={threadId}
        activeModel={data?.thread?.model}
        onModelChange={handleModelChange}
        onOpenSettings={() => setShowSettings(true)}
        view={view}
        onViewChange={setView}
        publishArtifact={
          activeArtifact
            ? { id: activeArtifact.id, isPublic: Boolean(activeArtifact.is_public) }
            : null
        }
        onPublished={() => qc.invalidateQueries({ queryKey: ["thread", threadId] })}
      />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r border-border md:block">
          <ThreadList activeThreadId={threadId} />
        </aside>

        {/* Chat pane */}
        <section
          id="main-content"
          className={cn(
            "flex min-h-0 w-full flex-col border-r border-border md:w-[440px] lg:w-[520px] md:flex",
            view === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          {/* StickToBottom scrolls internally; the root stays the positioning context for the pill. */}
          <StickToBottom className="relative min-h-0 flex-1" resize="smooth" initial="instant">
            <StickToBottom.Content className="px-4 sm:px-6">
              {isLoading ? (
                <ChatSkeleton />
              ) : (
                <MessageList
                  messages={messages}
                  status={status}
                  onRegenerate={() => regenerate()}
                  onPickPrompt={(p) => sendMessage({ text: p })}
                  onFocusCanvas={() => {
                    setView("preview");
                    if (artifacts[0]) setActiveArtifactId(artifacts[0].id);
                  }}
                />
              )}
            </StickToBottom.Content>
            <JumpToLatest />
          </StickToBottom>
          <div
            data-composer
            className="flex-none p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
          >
            <Composer
              onSend={(text) => sendMessage({ text })}
              disabled={streaming}
              streaming={streaming}
              mode={mode}
              onModeChange={setMode}
              suggestions={
                messages.length === 0
                  ? [
                      "Design a hero for a rocket startup",
                      "Build a pricing page in HTML",
                      "Explain React server components",
                    ]
                  : []
              }
            />
          </div>
        </section>

        {/* Canvas pane */}
        <section
          className={cn(
            "min-h-0 flex-1 flex-col md:flex",
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
                      "shrink-0 rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors",
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
          <Canvas artifact={activeArtifact} />
        </section>
      </div>

      <AppDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Agent settings"
        description="Configure model, temperature, system prompt, and tools."
      >
        <Suspense
          fallback={
            <div className="space-y-4" aria-hidden>
              <Skeleton className="h-8 w-2/3 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          }
        >
          <AgentSettingsPanel />
        </Suspense>
      </AppDialog>

      <CommandPalette
        open={showPalette}
        onOpenChange={setShowPalette}
        onToggleView={() => setView((v) => (v === "chat" ? "preview" : "chat"))}
        onOpenSettings={() => setShowSettings(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onPickTemplate={(prompt) => {
          setView("chat");
          sendMessage({ text: prompt });
        }}
      />
      <ShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="stagger flex flex-col gap-6 py-6" aria-hidden>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-3/5 rounded-2xl" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-[26px] w-[26px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-8 w-2/5 rounded-2xl" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-[26px] w-[26px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
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
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-subtle bg-popover/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-elevated backdrop-blur transition-all hover:bg-surface-2 motion-safe:animate-in-scale"
      aria-label="Jump to latest message"
    >
      <ArrowDown className="h-3.5 w-3.5" />
      Latest
    </button>
  );
}
