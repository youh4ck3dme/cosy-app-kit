import { CosyLogo } from "@/components/brand/CosyLogo";
import { cn } from "@/lib/utils";

/**
 * Back-compat logo slot used across the app shell.
 * Renders the COSY.AI Spatial AST mark (icon-only by default).
 */
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
    <CosyLogo
      size={size}
      showWordmark={false}
      showSubtitle={false}
      variant="spatial"
      decorative={decorative}
      className={cn(className)}
    />
  );
}
