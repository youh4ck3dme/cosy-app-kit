import { Link, useNavigate } from "@tanstack/react-router";
import { Settings, Menu, X, ChevronDown, LogOut, Rocket } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_MODELS, resolveKnownModelId } from "@/lib/models";
import { setArtifactPublic } from "@/lib/threads.functions";
import { haptic } from "@/lib/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppDialog } from "./AppDialog";
import { ThreadList } from "./ThreadList";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function Header({
  activeThreadId,
  activeModel,
  onModelChange,
  onOpenSettings,
  view,
  onViewChange,
  publishArtifact,
  onPublished,
}: {
  activeThreadId?: string;
  activeModel?: string;
  onModelChange?: (model: string) => void;
  onOpenSettings: () => void;
  view: "chat" | "preview";
  onViewChange: (v: "chat" | "preview") => void;
  publishArtifact?: { id: string; isPublic: boolean } | null;
  onPublished?: () => void;
}) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const publish = useServerFn(setArtifactPublic);
  const resolvedModel = resolveKnownModelId(activeModel);
  const activeLabel =
    AVAILABLE_MODELS.find((m) => m.id === resolvedModel)?.label ?? "Mistral Large";

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: { next: "" } });
  };

  const handlePublish = async () => {
    if (!publishArtifact || publishing) return;
    setPublishing(true);
    try {
      if (!publishArtifact.isPublic) {
        await publish({ data: { artifactId: publishArtifact.id, isPublic: true } });
      }
      const url = `${window.location.origin}/a/${publishArtifact.id}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      haptic();
      toast.success("Published — public link copied", { description: url });
      onPublished?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex-none border-b border-border-subtle glass-strong pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Link to="/chat" className="group flex items-center gap-2.5">
              <Logo size={30} />
              <span className="hidden font-mono text-[13px] font-semibold tracking-tight sm:inline">
                Builder
              </span>
            </Link>
            <div className="hidden h-5 w-px bg-border-subtle sm:block" />
            <div
              role="tablist"
              aria-label="Workspace view"
              className="hidden items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 text-[11px] font-mono font-medium sm:flex"
            >
              {(["chat", "preview"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => onViewChange(v)}
                  className={cn(
                    "rounded-md px-3 py-1 uppercase tracking-wider transition-all",
                    view === v
                      ? "bg-surface-3 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeThreadId && activeModel && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Model: ${activeLabel}. Change model for this chat`}
                  className="group hidden items-center gap-2 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-all hover:border-border-strong hover:bg-surface-2 hover:text-foreground md:flex"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 motion-safe:animate-ping rounded-full bg-accent-primary/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-primary" />
                  </span>
                  <span className="text-foreground">{activeLabel}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuRadioGroup
                    value={resolvedModel}
                    onValueChange={(id) => onModelChange?.(id)}
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <DropdownMenuRadioItem
                        key={m.id}
                        value={m.id}
                        className="flex-col items-start gap-0.5 py-2"
                      >
                        <span className="font-medium">{m.label}</span>
                        {m.note && (
                          <span className="text-[11px] text-muted-foreground">{m.note}</span>
                        )}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={onOpenSettings}
              className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:inline-flex"
              aria-label="Agent settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={handlePublish}
              disabled={!publishArtifact || publishing}
              title={
                publishArtifact
                  ? "Publish this artifact and copy its public link"
                  : "Create an artifact first"
              }
              className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_24px_-6px_color-mix(in_oklab,white_60%,transparent)] transition-all hover:scale-[1.03] hover:shadow-[0_0_32px_-4px_color-mix(in_oklab,white_70%,transparent)] disabled:pointer-events-none disabled:opacity-40 md:inline-flex"
            >
              <Rocket className="h-3 w-3" />
              {publishing ? "Publishing…" : publishArtifact?.isPublic ? "Published" : "Publish"}
            </button>
            {/* Right-side hamburger on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)] md:hidden animate-in-fade"
        >
          <div className="flex h-14 flex-none items-center justify-between border-b border-border-subtle px-4">
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Logo size={26} />
              <span className="font-mono text-sm font-semibold">Builder</span>
            </div>
            <div className="w-9" />
          </div>
          <div className="flex-1 overflow-y-auto stagger">
            <div className="p-3">
              <div className="mb-2 flex gap-1 rounded-lg border border-border-subtle bg-surface-1/60 p-0.5">
                {(["chat", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      onViewChange(v);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex-1 rounded-md px-3 py-2 text-xs font-mono uppercase tracking-wider transition-all",
                      view === v
                        ? "bg-surface-3 text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <ThreadList activeThreadId={activeThreadId} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-none space-y-2 border-t border-border-subtle p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-3 text-sm hover:bg-surface-2"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-3 text-sm hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Re-export for lazy use.
export { AppDialog };
