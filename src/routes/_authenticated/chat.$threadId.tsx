import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getThread, updateThreadModel } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/app-shell/Header";
import { ThreadList } from "@/components/app-shell/ThreadList";
import { Canvas } from "@/components/app-shell/Canvas";
import { Composer, type BuilderMode } from "@/components/app-shell/Composer";
import { MessageList } from "@/components/app-shell/MessageList";
import { AppDialog } from "@/components/app-shell/AppDialog";
import { AgentSettingsPanel } from "@/components/app-shell/AgentSettingsPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatPage,
});

type Artifact = {
  id: string;
  kind: "html" | "markdown" | "code";
  title: string;
  content: string;
  created_at: string;
};

function ChatPage() {
  const { threadId } = useParams({ from: "/_authenticated/chat/$threadId" });
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
  const [view, setView] = useState<"chat" | "preview">("chat");
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [mode, setMode] = useState<BuilderMode>("Build");
  const modeRef = useRef<BuilderMode>("Build");
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

  const { messages, sendMessage, status, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["thread", threadId] });
      qc.invalidateQueries({ queryKey: ["threads"] });
    },
  });


  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const artifacts = (data?.artifacts ?? []) as Artifact[];
  useEffect(() => {
    if (!activeArtifactId && artifacts.length > 0) setActiveArtifactId(artifacts[0].id);
  }, [artifacts, activeArtifactId]);
  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0];

  // Switch to preview automatically the first time an artifact appears on mobile
  const artifactCount = artifacts.length;
  useEffect(() => {
    if (artifactCount > 0 && window.matchMedia("(max-width: 767px)").matches) {
      setView("preview");
    }
  }, [artifactCount]);

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
      />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r border-border md:block">
          <ThreadList activeThreadId={threadId} />
        </aside>

        {/* Chat pane */}
        <section
          className={cn(
            "flex min-h-0 w-full flex-col border-r border-border md:w-[440px] lg:w-[520px] md:flex",
            view === "chat" ? "flex" : "hidden md:flex",
          )}
        >
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6">
            {isLoading ? (
              <div className="pt-10 text-center text-sm text-muted-foreground">Loading chat…</div>
            ) : messages.length === 0 ? (
              <EmptyPrompt onPick={(p) => sendMessage({ text: p })} />
            ) : (
              <MessageList messages={messages} status={status} />
            )}
          </div>
          <div className="flex-none p-3 sm:p-4">
            <Composer
              onSend={(text) => sendMessage({ text })}
              disabled={streaming}
              streaming={streaming}
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
            <input ref={inputRef as unknown as React.RefObject<HTMLInputElement>} className="sr-only" tabIndex={-1} aria-hidden />
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
        <AgentSettingsPanel />
      </AppDialog>
    </div>
  );
}

function EmptyPrompt({ onPick }: { onPick: (p: string) => void }) {
  const prompts = [
    "Design a landing page for an AI note-taking app",
    "Write a markdown README for a Rust CLI",
    "Build an HTML dashboard mock with dark theme",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-[10px] tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground" /> READY
      </div>
      <h2 className="max-w-md font-mono text-2xl font-bold tracking-tight">
        What are we building?
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ask Builder to generate an HTML artifact, a markdown doc, or explain something.
      </p>
      <div className="mt-6 flex w-full max-w-md flex-col gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-surface hover:text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
