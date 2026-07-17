import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Chip({
  children,
  selected,
  onClick,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-all",
        selected
          ? "border-foreground/40 bg-foreground text-background shadow-sm"
          : "border-border bg-surface/60 text-muted-foreground hover:border-border hover:bg-surface hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * ChipFilter: single-select chip group.
 * Clicking the currently-selected chip clears the selection (reverts to default).
 */
export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T | null;
  onChange: (v: T | null) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar", className)}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Chip key={o.value} selected={selected} onClick={() => onChange(selected ? null : o.value)}>
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}
