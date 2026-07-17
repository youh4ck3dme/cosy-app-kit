import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plus, MessageSquare, Trash2, Loader2, Search } from "lucide-react";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Thread = { id: string; title: string; updated_at?: string; created_at?: string };

function groupThreads(threads: Thread[]) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const groups: { label: string; items: Thread[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const t of threads) {
    const ts = new Date(t.updated_at ?? t.created_at ?? Date.now()).getTime();
    const diff = now - ts;
    if (diff < DAY) groups[0].items.push(t);
    else if (diff < 2 * DAY) groups[1].items.push(t);
    else if (diff < 8 * DAY) groups[2].items.push(t);
    else groups[3].items.push(t);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function ThreadList({
  activeThreadId,
  onNavigate,
}: {
  activeThreadId?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);
  const [query, setQuery] = useState("");

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
      <div className="flex flex-none items-center gap-2 px-3 pt-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full rounded-lg border border-border-subtle bg-surface-1/60 py-1.5 pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-border-strong"
          />
        </div>
        <button
          onClick={handleNew}
          title="New chat"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-surface-1/60 text-muted-foreground transition-all hover:border-accent-primary/50 hover:bg-surface-2 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
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
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-surface-3 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
