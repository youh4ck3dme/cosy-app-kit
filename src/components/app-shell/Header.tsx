import { Link, useNavigate } from "@tanstack/react-router";
import { Settings, Menu, Zap, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_MODELS } from "@/lib/ai-gateway.server";
import { AppDialog } from "./AppDialog";
import { ThreadList } from "./ThreadList";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const activeLabel =
    AVAILABLE_MODELS.find((m) => m.id === activeModel)?.label ?? activeModel ?? "Model";

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  return (
    <>
      <header className="z-40 flex-none border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-4">
            <Link to="/chat" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-panel">
                <Zap className="h-4 w-4" />
              </span>
              BUILDER
            </Link>
            <div className="hidden items-center rounded-lg border border-border bg-surface p-0.5 text-[11px] font-mono font-medium sm:flex">
              <button
                onClick={() => onViewChange("chat")}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  view === "chat" ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                CHAT
              </button>
              <button
                onClick={() => onViewChange("preview")}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  view === "preview" ? "bg-elevated text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                PREVIEW
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeThreadId && activeModel && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setModelOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setModelOpen(false), 140)}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:bg-surface"
                >
                  <span className="text-foreground">{activeLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {modelOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border bg-panel p-1 shadow-2xl">
                    {AVAILABLE_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onModelChange?.(m.id);
                          setModelOpen(false);
                        }}
                        className={cn(
                          "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm hover:bg-surface",
                          activeModel === m.id && "bg-surface",
                        )}
                      >
                        <span className="font-medium">{m.label}</span>
                        {m.note && (
                          <span className="text-[11px] text-muted-foreground">{m.note}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onOpenSettings}
              className="hidden rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground md:inline-flex"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => toast.info("Publish is a preview-only affordance in this build.")}
              className="hidden items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-foreground shadow-[0_0_15px_rgba(255,255,255,0.12)] transition-all hover:scale-[1.02] md:inline-flex"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              PUBLISH
            </button>
            {/* Right-side hamburger on mobile */}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-surface hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="font-mono text-sm font-semibold">MENU</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ThreadList activeThreadId={activeThreadId} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t border-border p-3">
            <button
              onClick={() => {
                setMobileOpen(false);
                onOpenSettings();
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm hover:bg-elevated"
            >
              <Settings className="h-4 w-4" /> Settings
            </button>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm hover:bg-elevated"
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
