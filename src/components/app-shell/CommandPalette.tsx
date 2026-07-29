import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { AVAILABLE_MODELS } from "@/lib/models";
import {
  createThread,
  listThreadMemory,
  listThreads,
  updateThreadModel,
} from "@/lib/threads.functions";
import { STARTERS } from "@/lib/starters";
import { toast } from "sonner";
import type { Artifact } from "@/components/app-shell/Canvas";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeThreadId?: string;
  mode: "Build" | "Plan";
  onToggleMode: () => void;
  onOpenSettings: () => void;
  onToggleSidebar?: () => void;
  onPickStarter?: (prompt: string) => void;
  onShowShortcuts?: () => void;
  onExportArtifact?: () => void | Promise<void>;
  activeArtifact?: Artifact | null;
};

export function CommandPalette({
  open,
  onOpenChange,
  activeThreadId,
  mode,
  onToggleMode,
  onOpenSettings,
  onToggleSidebar,
  onPickStarter,
  onShowShortcuts,
  onExportArtifact,
  activeArtifact,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const updateModel = useServerFn(updateThreadModel);
  const listMem = useServerFn(listThreadMemory);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: () => list(),
    enabled: open,
  });

  const { data: memory = [] } = useQuery({
    queryKey: ["thread-memory", activeThreadId],
    queryFn: () => listMem({ data: { threadId: activeThreadId! } }),
    enabled: open && Boolean(activeThreadId),
  });

  const sorted = useMemo(
    () => [...threads].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)),
    [threads],
  );

  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={async () => {
              const { id } = await create({ data: {} });
              await qc.invalidateQueries({ queryKey: ["threads"] });
              close();
              navigate({ to: "/chat/$threadId", params: { threadId: id } });
            }}
          >
            New thread
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onToggleMode();
              toast.success(`Mode: ${mode === "Build" ? "Plan" : "Build"}`);
              close();
            }}
          >
            Toggle Plan / Build (now {mode})
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenSettings();
              close();
            }}
          >
            Open agent settings
          </CommandItem>
          <CommandItem
            onSelect={() => {
              close();
              navigate({ to: "/dashboard" });
            }}
          >
            Go to Dashboard
          </CommandItem>
          {onToggleSidebar && (
            <CommandItem
              onSelect={() => {
                onToggleSidebar();
                close();
              }}
            >
              Toggle sidebar (desktop)
            </CommandItem>
          )}
          {onExportArtifact && (
            <CommandItem
              onSelect={async () => {
                try {
                  await onExportArtifact();
                  toast.success("Export started");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Export failed");
                }
                close();
              }}
            >
              Export ZIP
            </CommandItem>
          )}
          {activeArtifact?.is_public && (
            <CommandItem
              onSelect={async () => {
                const url = `${window.location.origin}/a/${activeArtifact.id}`;
                await navigator.clipboard.writeText(url);
                toast.success("Share link copied");
                close();
              }}
            >
              Copy share link
            </CommandItem>
          )}
          {onShowShortcuts && (
            <CommandItem
              onSelect={() => {
                onShowShortcuts();
                close();
              }}
            >
              Show keyboard shortcuts
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Starters">
          {STARTERS.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.title} ${s.category} ${s.prompt}`}
              onSelect={() => {
                onPickStarter?.(s.prompt);
                close();
              }}
            >
              {s.title}
              <span className="ml-2 text-muted-foreground">{s.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {activeThreadId && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Switch model">
              {AVAILABLE_MODELS.map((m) => (
                <CommandItem
                  key={m.id}
                  onSelect={async () => {
                    await updateModel({ data: { threadId: activeThreadId, model: m.id } });
                    await qc.invalidateQueries({ queryKey: ["thread", activeThreadId] });
                    toast.success(`Model → ${m.label}`);
                    close();
                  }}
                >
                  {m.label}
                  {m.note ? <span className="ml-2 text-muted-foreground">· {m.note}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Memory">
              {memory.length === 0 ? (
                <CommandItem
                  onSelect={() => {
                    onOpenSettings();
                    close();
                  }}
                >
                  No memory yet — Open settings
                </CommandItem>
              ) : (
                memory.slice(0, 12).map((row) => (
                  <CommandItem
                    key={row.id}
                    value={`memory ${row.key}`}
                    onSelect={() => {
                      onOpenSettings();
                      close();
                    }}
                  >
                    {row.key}
                    <span className="ml-2 truncate text-muted-foreground">
                      {typeof row.value === "string"
                        ? row.value.slice(0, 40)
                        : JSON.stringify(row.value).slice(0, 40)}
                    </span>
                  </CommandItem>
                ))
              )}
              <CommandItem
                onSelect={() => {
                  onOpenSettings();
                  close();
                }}
              >
                Open settings (edit memory)
              </CommandItem>
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Threads">
          {sorted.slice(0, 20).map((t) => (
            <CommandItem
              key={t.id}
              value={`${t.title} ${t.id}`}
              onSelect={() => {
                close();
                navigate({ to: "/chat/$threadId", params: { threadId: t.id } });
              }}
            >
              {t.title || "Untitled"}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const rows: Array<[string, string]> = [
    ["⌘/Ctrl+K", "Command palette"],
    ["⌘/Ctrl+/", "Toggle Plan / Build"],
    ["⌘/Ctrl+N", "New thread"],
    ["⌘/Ctrl+B", "Toggle sidebar (desktop only)"],
    ["⌘/Ctrl+Enter", "Send message"],
    ["F", "Fullscreen preview (canvas)"],
    ["?", "This help"],
    ["Esc", "Close palette / fullscreen / help"],
  ];
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-panel p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          On mobile, use the hamburger menu — Cmd+B does not apply.
        </p>
        <ul className="mt-4 space-y-2">
          {rows.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{v}</span>
              <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px]">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground"
        >
          Close
        </button>
      </div>
    </div>
  );
}
