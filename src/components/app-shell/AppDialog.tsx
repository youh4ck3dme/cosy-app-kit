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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center">
      {/* Blurred overlay — starts BELOW the header row (56px) on desktop, full-screen on mobile */}
      <div
        onClick={onClose}
        className="absolute inset-0 top-0 bg-background/60 backdrop-blur-xl md:top-14"
        aria-hidden
      />
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden bg-panel md:h-auto md:max-h-[85vh] md:w-full md:max-w-2xl md:rounded-2xl md:border md:border-border md:shadow-2xl",
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
