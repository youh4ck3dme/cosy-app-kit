import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-background/60 backdrop-blur-xl md:bg-background/55 md:backdrop-blur-2xl md:animate-in-fade"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-[var(--app-height,100dvh)] w-full flex-col overflow-hidden bg-panel md:h-auto md:max-h-[min(85vh,var(--app-height,85vh))] md:w-full md:max-w-2xl md:rounded-2xl md:border md:border-border-subtle md:shadow-elevated md:animate-in-scale",
          "native-sheet",
          className,
        )}
      >
        <div className="flex flex-none items-start justify-between border-b border-border-subtle px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:py-4 md:pt-4">
          <div className="min-w-0 pr-4">
            {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5 md:px-6 md:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
