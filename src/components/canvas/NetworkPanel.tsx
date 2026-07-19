import { cn } from "@/lib/utils";

export type NetworkEntry = {
  id: string;
  method: string;
  url: string;
  status: number | null;
  ms: number | null;
  ts: number;
};

export function NetworkPanel({
  entries,
  onClear,
}: {
  entries: NetworkEntry[];
  onClear: () => void;
}) {
  return (
    <div className="flex max-h-64 min-h-32 flex-none flex-col border-t border-border-subtle bg-surface-1/95 backdrop-blur">
      <div className="flex flex-none items-center justify-between border-b border-border-subtle px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">
          Network <span className="font-mono tabular-nums">{entries.length}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-1 font-mono text-[11px]">
        {entries.length === 0 && (
          <div className="px-1 py-2 text-muted-foreground/70">No fetch calls yet.</div>
        )}
        {entries.map((e) => (
          <div
            key={e.id}
            className={cn(
              "grid grid-cols-[52px_1fr_48px_48px] gap-2 border-b border-border-subtle/40 py-1",
              e.status && e.status >= 400 && "text-[oklch(0.72_0.19_25)]",
            )}
          >
            <span className="text-muted-foreground">{e.method}</span>
            <span className="truncate" title={e.url}>
              {e.url}
            </span>
            <span className="tabular-nums text-right">{e.status ?? "…"}</span>
            <span className="tabular-nums text-right text-muted-foreground">
              {e.ms != null ? `${e.ms}ms` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
