import { Link, useNavigate } from "@tanstack/react-router";
import { Settings, Menu, X, ChevronDown, LogOut, Rocket, Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authSearch } from "@/integrations/lovable";
import { AVAILABLE_MODELS, resolveKnownModelId } from "@/lib/models";
import { useTheme, type Theme } from "@/lib/theme";
import { AppDialog } from "./AppDialog";
import { ThreadList } from "./ThreadList";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const THEME_CYCLE: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const THEME_META: Record<Theme, { Icon: typeof Sun; label: string }> = {
  light: { Icon: Sun, label: "Theme: light" },
  dark: { Icon: Moon, label: "Theme: dark" },
  system: { Icon: Monitor, label: "Theme: system" },
};

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { Icon, label } = THEME_META[theme];
  return (
    <button
      type="button"
      onClick={() => setTheme(THEME_CYCLE[theme])}
      className={className}
      aria-label={`${label} — switch to ${THEME_CYCLE[theme]}`}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function Header({
  activeThreadId,
  activeModel,
  onModelChange,
  onOpenSettings,
  view,
  onViewChange,
}: {
  activeThreadId?: string;
  activeModel?: string;
  onModelChange?: (model: string) => void;
  onOpenSettings: () => void;
  view: "chat" | "preview";
  onViewChange: (v: "chat" | "preview") => void;
}) {
  const navigate = useNavigate();
  const [modelOpen, setModelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const resolvedModel = resolveKnownModelId(activeModel);
  const activeLabel =
    AVAILABLE_MODELS.find((m) => m.id === resolvedModel)?.label ?? "Mistral Large";

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", search: authSearch("") });
  };

  return (
    <>
      <header className="z-40 flex-none border-b border-border-subtle glass-strong pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <Link to="/chat" className="group flex items-center gap-2.5">
              <Logo size={30} />
              <span className="hidden font-mono text-[13px] font-semibold tracking-tight sm:inline">
                Builder
              </span>
            </Link>
            <div className="hidden h-5 w-px bg-border-subtle sm:block" />
            {/* Always visible — mobile must reach Preview after artifact without opening the menu */}
            <div
              className="flex items-center rounded-lg border border-border-subtle bg-surface-1/70 p-0.5 text-[11px] font-mono font-medium"
              role="group"
              aria-label="Chat or preview"
            >
              {(["chat", "preview"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onViewChange(v)}
                  aria-label={v === "chat" ? "Show chat view" : "Show preview canvas"}
                  aria-pressed={view === v}
                  className={cn(
                    "min-h-9 rounded-md px-2.5 py-1 uppercase tracking-wider transition-all sm:px-3",
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
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setModelOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setModelOpen(false), 140)}
                  aria-label={`Model: ${activeLabel}`}
                  aria-expanded={modelOpen}
                  aria-haspopup="listbox"
                  className="group flex items-center gap-2 rounded-full border border-border-subtle bg-surface-1/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-all hover:border-border-strong hover:bg-surface-2 hover:text-foreground"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent-primary/60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-primary" />
                  </span>
                  <span className="text-foreground">{activeLabel}</span>
                  <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-hover:translate-y-px" />
                </button>
                {modelOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-border-subtle bg-popover p-1 shadow-elevated animate-in-scale">
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onModelChange?.(m.id);
                          setModelOpen(false);
                        }}
                        className={cn(
                          "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2",
                          activeModel === m.id && "bg-surface-2",
                        )}
                      >
                        <span className="font-medium">{m.label}</span>
                        {m.note && (
                          <span className="mt-0.5 text-[11px] text-muted-foreground">{m.note}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <ThemeToggle className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:inline-flex" />
            <button
              type="button"
              onClick={onOpenSettings}
              className="hidden rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground md:inline-flex"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Publish is a preview-only affordance in this build.")}
              aria-label="Publish"
              className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_24px_-6px_color-mix(in_oklab,white_60%,transparent)] transition-all hover:scale-[1.03] hover:shadow-[0_0_32px_-4px_color-mix(in_oklab,white_70%,transparent)] md:inline-flex"
            >
              <Rocket className="h-3 w-3" />
              Publish
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
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden animate-in-fade">
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
                    type="button"
                    onClick={() => {
                      onViewChange(v);
                      setMobileOpen(false);
                    }}
                    aria-label={v === "chat" ? "Show chat view" : "Show preview canvas"}
                    aria-pressed={view === v}
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
          <div className="flex-none space-y-2 border-t border-border-subtle p-3">
            <ThemeToggle className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground" />
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
