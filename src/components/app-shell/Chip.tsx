import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  onClick,
  active,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-accent-primary/50 bg-accent-primary/12 text-foreground shadow-[0_0_20px_-6px_color-mix(in_oklab,var(--color-accent-primary)_60%,transparent)]"
          : "border-border-subtle bg-surface-1/60 text-muted-foreground hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Single-select chip filter: clicking the currently-selected chip unselects it
 * and reverts to the default (null value).
 */
export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Chip key={opt.value} active={active} onClick={() => onChange(active ? null : opt.value)}>
            {opt.label}
          </Chip>
        );
      })}
    </div>
  );
}
