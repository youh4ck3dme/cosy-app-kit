"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listArtifactVersions, restoreArtifactVersion } from "@/lib/threads.functions";

type VersionRow = {
  id: string;
  artifact_id: string;
  source: string;
  title: string | null;
  entry_path: string | null;
  created_at: string;
  bytes: number;
};

const SOURCE_LABEL: Record<string, string> = {
  tool: "tool",
  fence: "fence",
  user_save: "user_save",
  restore: "restore",
};

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function isMissingRelation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /artifact_versions|relation|does not exist|schema cache|42P01/i.test(msg);
}

export function VersionTimeline({
  artifactId,
  threadId,
}: {
  artifactId: string;
  threadId?: string;
}) {
  const list = useServerFn(listArtifactVersions);
  const restore = useServerFn(restoreArtifactVersion);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["artifact-versions", artifactId],
    queryFn: () => list({ data: { artifactId, limit: 40 } }),
    enabled: open && Boolean(artifactId),
    retry: false,
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) => restore({ data: { versionId } }),
    onSuccess: async () => {
      toast.success("Version restored");
      setConfirmId(null);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["artifact-versions", artifactId] });
      if (threadId) await qc.invalidateQueries({ queryKey: ["thread", threadId] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    },
  });

  const rows = (q.data ?? []) as VersionRow[];
  const missingTable = q.isError && isMissingRelation(q.error);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
          open
            ? "bg-surface-3 text-foreground"
            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        )}
        aria-expanded={open}
        aria-label="Version timeline"
        title="Version timeline"
      >
        <History className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Versions</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-border-subtle bg-popover shadow-elevated animate-in-scale">
          <div className="border-b border-border-subtle px-3 py-2 text-xs font-semibold">
            Version timeline
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {q.isLoading && (
              <p className="px-2 py-3 text-[12px] text-muted-foreground">Loading…</p>
            )}
            {missingTable && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                Apply migration <code className="font-mono">20260720120000</code> — see{" "}
                <span className="font-medium">docs/migrations.md</span>.
              </p>
            )}
            {q.isError && !missingTable && (
              <p className="px-2 py-3 text-[12px] text-destructive">
                {q.error instanceof Error ? q.error.message : "Failed to load versions"}
              </p>
            )}
            {q.isSuccess && rows.length === 0 && (
              <p className="px-2 py-3 text-[12px] text-muted-foreground">
                No versions yet — save or let the agent edit.
              </p>
            )}
            {rows.map((v) => {
              const badge = SOURCE_LABEL[v.source] ?? v.source;
              const confirming = confirmId === v.id;
              return (
                <div
                  key={v.id}
                  className="mb-1 rounded-lg border border-border-subtle/60 bg-surface-1/40 px-2.5 py-2 last:mb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-border-subtle bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {badge}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {formatWhen(v.created_at)}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[12px] text-foreground/90">
                        {v.title || v.entry_path || "Snapshot"}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {(v.bytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    {!confirming ? (
                      <button
                        type="button"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                        onClick={() => setConfirmId(v.id)}
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </button>
                    ) : (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          disabled={restoreMut.isPending}
                          className="min-h-8 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground"
                          onClick={() => restoreMut.mutate(v.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="min-h-8 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-surface-2"
                          onClick={() => setConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
