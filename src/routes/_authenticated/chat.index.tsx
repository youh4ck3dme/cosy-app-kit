import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { listThreads, createThread } from "@/lib/threads.functions";
import { ThreadList } from "@/components/app-shell/ThreadList";

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
  const { data, isLoading } = useQuery({ queryKey: ["threads"], queryFn: () => list() });

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      if (data && data.length > 0) {
        navigate({ to: "/chat/$threadId", params: { threadId: data[0].id }, replace: true });
      } else {
        const { id } = await create({ data: {} });
        await qc.invalidateQueries({ queryKey: ["threads"] });
        navigate({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
      }
    })();
  }, [data, isLoading, navigate, create, qc]);

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <ThreadList />
      </aside>
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening chat…
      </div>
    </div>
  );
}
