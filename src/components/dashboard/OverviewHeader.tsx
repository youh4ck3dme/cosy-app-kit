import { Pencil, Star } from "lucide-react";
import { Logo } from "@/components/app-shell/Logo";

export function OverviewHeader({
  email,
  createdLabel,
}: {
  email?: string | null;
  createdLabel: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border-subtle bg-surface-2 shadow-elevated">
            <Logo size={36} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">Builder</h1>
              <span className="text-muted-foreground" aria-hidden>
                <Pencil className="h-3.5 w-3.5 opacity-50" />
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              A dark, focused AI studio. Chat with your agent and ship live artifacts to a preview
              canvas.
              <span className="ml-1 inline-block align-middle text-muted-foreground/50" aria-hidden>
                <Pencil className="inline h-3 w-3" />
              </span>
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground/80">
              {createdLabel}
              {email ? ` · ${email}` : ""}
            </p>
          </div>
        </div>
        <Star className="h-5 w-5 shrink-0 fill-amber-400/90 text-amber-400" aria-hidden />
      </div>
    </div>
  );
}
