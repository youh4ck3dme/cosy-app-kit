import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { listThreads, createThread } from "@/lib/threads.functions";
import { ThreadList } from "@/components/app-shell/ThreadList";
import { useAppViewportLock } from "@/hooks/use-app-viewport-lock";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
  errorComponent: ({ error, reset }) => (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold">Could not open chat</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        onClick={() => reset()}
      >
        Retry
      </button>
    </div>
  ),
});

function ChatIndex() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const {
    data,
    isLoading,
    isError,
    error: listError,
  } = useQuery({
    queryKey: ["threads"],
    queryFn: () => list(),
  });
  const [bootError, setBootError] = useState<string | null>(null);
  useAppViewportLock(true);

  useEffect(() => {
    if (isLoading) return;
    if (isError) {
      setBootError(listError?.message || "Failed to load chats");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        setBootError(null);
        let threadId: string | undefined;
        // Never open optimistic-* placeholders (New chat race with ThreadList cache).
        const realThreads = (data ?? []).filter((t) => !t.id.startsWith("optimistic-"));
        if (realThreads.length > 0) {
          threadId = realThreads[0]!.id;
        } else {
          const { id } = await create({ data: {} });
          threadId = id;
          await qc.invalidateQueries({ queryKey: ["threads"] });
        }
        if (cancelled) return;
        if (!threadId || threadId.startsWith("optimistic-") || !/^[0-9a-f-]{36}$/i.test(threadId)) {
          setBootError("Could not create a chat (invalid thread id). Try again.");
          return;
        }
        // Macrotask after commit — navigate must not race Transitioner first paint.
        timer = setTimeout(() => {
          if (cancelled) return;
          void navigate({
            to: "/chat/$threadId",
            params: { threadId },
            replace: true,
          });
        }, 0);
      } catch (e) {
        if (!cancelled) {
          setBootError((e as Error).message || "Could not open chat");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [data, isLoading, isError, listError, navigate, create, qc]);

  if (bootError) {
    return (
      <div className="app-shell-fixed flex flex-col">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border md:block">
          <ThreadList />
        </aside>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-destructive">{bootError}</p>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              setBootError(null);
              void qc.invalidateQueries({ queryKey: ["threads"] });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell-fixed flex flex-col">
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border md:block">
        <ThreadList />
      </aside>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening chat…
      </div>
    </div>
  );
}
