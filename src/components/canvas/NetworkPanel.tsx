import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type NetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number | null;
  ms: number | null;
  ts: number;
  type?: "fetch" | "xhr";
  error?: string;
  ok?: boolean;
};

type NetworkFilter = "all" | "ok" | "fail";

/** Pending rows (status null) are neither ok nor fail. */
export function isFail(e: NetworkEntry): boolean {
  if (e.status == null) return false;
  return e.status === 0 || e.status >= 400 || e.ok === false;
}

/** Completed non-fail rows. Pending is not ok. */
export function isOk(e: NetworkEntry): boolean {
  if (e.status == null) return false;
  return !isFail(e);
}

export function NetworkPanel({
  entries,
  onClear,
  onClose,
}: {
  entries: NetworkEntry[];
  onClear: () => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<NetworkFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ok") return entries.filter(isOk);
    if (filter === "fail") return entries.filter(isFail);
    return entries;
  }, [entries, filter]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const failCount = entries.filter(isFail).length;

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  return (
    <div className="flex max-h-72 min-h-36 flex-none flex-col border-t border-border-subtle bg-surface-1/95 backdrop-blur">
      <div className="flex flex-none items-center justify-between gap-2 border-b border-border-subtle px-3 py-1.5">
        <div className="inline-flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <span>
            Network{" "}
            <span className="font-mono tabular-nums text-muted-foreground/70">
              {entries.length}
            </span>
          </span>
          {failCount > 0 && (
            <span className="rounded-full bg-destructive/20 px-1.5 font-mono text-[10px] text-destructive tabular-nums">
              {failCount} fail
            </span>
          )}
          <div className="flex gap-0.5">
            {(["all", "ok", "fail"] as NetworkFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                  filter === f
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            aria-label="Close network panel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-[11px]">
          {entries.length === 0 && (
            <div className="space-y-1 px-1 py-2 text-muted-foreground/80">
              <p>No fetch / XHR calls from the sandboxed preview yet.</p>
              <p className="text-[10px] text-muted-foreground/60">
                Apps that only use localStorage stay empty here. Trigger{" "}
                <code className="text-foreground/70">fetch()</code> or{" "}
                <code className="text-foreground/70">XMLHttpRequest</code> in the preview to
                populate this panel.
              </p>
            </div>
          )}
          {entries.length > 0 && filtered.length === 0 && (
            <div className="px-1 py-2 text-muted-foreground/70">
              No requests match this filter. Switch to All or clear filters.
            </div>
          )}
          {filtered.map((e) => {
            const pending = e.status == null;
            const fail = isFail(e);
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedId(e.id)}
                className={cn(
                  "grid w-full grid-cols-[44px_36px_1fr_44px_48px] gap-2 border-b border-border-subtle/40 py-1 text-left hover:bg-surface-2/60",
                  selectedId === e.id && "bg-surface-2/80",
                  fail && "text-[oklch(0.72_0.19_25)]",
                  pending && "text-muted-foreground",
                )}
              >
                <span className="truncate text-muted-foreground">{e.method}</span>
                <span className="truncate text-[10px] uppercase text-muted-foreground/70">
                  {e.type ?? "fetch"}
                </span>
                <span className="truncate" title={e.url}>
                  {e.url}
                </span>
                <span className="tabular-nums text-right">{pending ? "…" : (e.status ?? "—")}</span>
                <span className="tabular-nums text-right text-muted-foreground">
                  {e.ms != null ? `${e.ms}ms` : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="flex max-h-40 min-h-0 w-full flex-none flex-col gap-1.5 overflow-auto border-t border-border-subtle px-3 py-2 text-[11px] sm:max-h-none sm:w-64 sm:border-l sm:border-t-0">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-foreground">Request</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                onClick={() => void copyUrl(selected.url)}
                aria-label="Copy request URL"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <div className="break-all font-mono text-foreground/90">{selected.url}</div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-muted-foreground">
              <span>Method</span>
              <span className="text-foreground">{selected.method}</span>
              <span>Type</span>
              <span className="text-foreground">{selected.type ?? "fetch"}</span>
              <span>Status</span>
              <span className={cn("text-foreground", isFail(selected) && "text-destructive")}>
                {selected.status ?? "pending"}
              </span>
              <span>Time</span>
              <span className="text-foreground">
                {selected.ms != null ? `${selected.ms}ms` : "—"}
              </span>
            </div>
            {selected.error && (
              <p className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-destructive">
                {selected.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
