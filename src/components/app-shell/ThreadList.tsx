import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, MessageSquare, Trash2, Loader2, Search } from "lucide-react";
import { listThreads } from "@/lib/threads.functions";
import { groupThreads, type ThreadListItem as Thread } from "@/lib/group-threads";
import { useCreateThread, useDeleteThread } from "@/hooks/use-thread-mutations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export function ThreadList({
  activeThreadId,
  onNavigate,
}: {
  activeThreadId?: string;
  onNavigate?: () => void;
}) {
  const list = useServerFn(listThreads);
  const createMutation = useCreateThread(onNavigate);
  const deleteMutation = useDeleteThread(activeThreadId);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Thread | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: () => list(),
  });

  const filtered = useMemo(() => {
    const items = (data ?? []) as Thread[];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((t) => t.title.toLowerCase().includes(q));
  }, [data, query]);

  const groups = useMemo(() => groupThreads(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 px-3 pt-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            id="thread-search"
            name="thread-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            autoComplete="off"
            className="w-full rounded-lg border border-border-subtle bg-surface-1/60 py-1.5 pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-border-strong"
          />
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          title="New chat"
          aria-label="New chat"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-surface-1/60 text-muted-foreground transition-all hover:border-accent-primary/50 hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <nav aria-label="Chats" className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            {query ? "No chats match." : "No chats yet."}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((t) => {
                const active = t.id === activeThreadId;
                const optimistic = t.id.startsWith("optimistic-");
                return (
                  <div key={t.id} className="group relative">
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-2 pr-8 text-sm transition-all",
                        active
                          ? "bg-surface-2 text-foreground"
                          : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                        optimistic && "opacity-70",
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-accent-primary"
                        />
                      )}
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          active ? "text-accent-primary" : "text-muted-foreground/70",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    </Link>
                    {!optimistic && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(t)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-surface-3 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label={`Delete chat ${t.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.title}” will be removed. This cannot be undone.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (target) deleteMutation.mutate({ threadId: target.id });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
