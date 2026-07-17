import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, MessageSquare, Trash2, Loader2, Zap } from "lucide-react";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ThreadList({ activeThreadId, onNavigate }: { activeThreadId?: string; onNavigate?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);

  const { data, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: () => list(),
  });

  const handleNew = async () => {
    try {
      const { id } = await create({ data: {} });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      onNavigate?.();
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this chat?")) return;
    try {
      await del({ data: { threadId: id } });
      await qc.invalidateQueries({ queryKey: ["threads"] });
      if (activeThreadId === id) navigate({ to: "/chat" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-muted-foreground">
          <Zap className="h-3.5 w-3.5" />
          CHATS
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs hover:bg-elevated"
          title="New chat"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        )}
        {data?.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No chats yet.
          </div>
        )}
        {data?.map((t) => {
          const active = t.id === activeThreadId;
          return (
            <div key={t.id} className="group relative">
              <Link
                to="/chat/$threadId"
                params={{ threadId: t.id }}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  active
                    ? "bg-elevated text-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
              </Link>
              <button
                onClick={() => handleDelete(t.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 hover:bg-elevated hover:text-destructive group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
