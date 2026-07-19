import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
  decorative = false,
}: {
  className?: string;
  size?: number;
  /** When true, hide from assistive tech (e.g. repeated avatars in a message list). */
  decorative?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-2 ring-1 ring-border-subtle",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden={decorative || undefined}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-lg opacity-70"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--color-accent-primary) 45%, transparent), transparent 65%)",
        }}
      />
      <img
        src={logoUrl}
        alt={decorative ? "" : "Builder"}
        width={size}
        height={size}
        className="relative h-[70%] w-[70%] object-contain"
      />
    </span>
  );
}
