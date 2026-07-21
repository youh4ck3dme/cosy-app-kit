import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type VisibilityMode = "public" | "private";

export function VisibilityCard({
  mode,
  onModeChange,
  artifacts,
  onTogglePublic,
  busyId,
}: {
  mode: VisibilityMode;
  onModeChange: (m: VisibilityMode) => void;
  artifacts: Array<{ id: string; title: string; is_public: boolean }>;
  onTogglePublic: (id: string, next: boolean) => void;
  busyId?: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-elevated">
      <h2 className="text-base font-semibold">App Visibility</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Control who can access shared artifacts from this workspace
      </p>

      <div className="mt-4">
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Default preference
        </label>
        <div
          className="flex gap-1 rounded-xl border border-border-subtle bg-surface-1/60 p-1"
          role="group"
          aria-label="Visibility"
        >
          {(
            [
              { id: "public" as const, label: "Public", Icon: Globe },
              { id: "private" as const, label: "Private", Icon: Lock },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              aria-pressed={mode === id}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm transition-colors",
                mode === id
                  ? "bg-surface-3 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Preference is stored locally. Toggle individual artifacts below to publish share links.
        </p>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Recent artifacts
        </p>
        {artifacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No artifacts yet — create one in Chat.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {artifacts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border-subtle/80 bg-surface-1/40 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{a.title || "Untitled"}</span>
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => onTogglePublic(a.id, !a.is_public)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    a.is_public
                      ? "bg-accent-primary/15 text-accent-primary"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a.is_public ? "Public" : "Private"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
