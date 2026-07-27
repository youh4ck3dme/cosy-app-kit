import * as React from "react";
import { cn } from "@/lib/utils";

export type CosyLogoVariant = "spatial" | "monogram" | "mono";

export interface CosyLogoProps {
  className?: string;
  /** Icon box size in px (mark only / lockup icon). */
  size?: number;
  /** Show COSY.AI wordmark next to mark. */
  showWordmark?: boolean;
  /** Show "Visual Code Engine" micro-label. */
  showSubtitle?: boolean;
  /** Mark style. */
  variant?: CosyLogoVariant;
  /** Hide from assistive tech when repeated. */
  decorative?: boolean;
}

/** Concept 1 — Spatial AST chevrons + center node */
function SpatialMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect
        width="64"
        height="64"
        rx="14"
        className="fill-brand-zinc dark:fill-brand-zinc"
        fill="#18181B"
        stroke="#27272A"
        strokeWidth="2"
      />
      <path
        d="M18 22L30 32L18 42"
        stroke="#818CF8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 22L34 32L46 42"
        stroke="#38BDF8"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="3.5" fill="#6366F1" />
    </svg>
  );
}

/** Concept 2 — Viewport C monogram (compact) */
function MonogramMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" fill="#09090B" />
      <rect x="1" y="1" width="62" height="62" rx="13" stroke="#27272A" strokeWidth="1.5" />
      <path
        d="M46 18H32C24 18 18 24 18 32C18 40 24 46 32 46H46"
        stroke="url(#cosy_mono_grad)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M46 18V46" stroke="#38BDF8" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <circle cx="46" cy="18" r="3.5" fill="#818CF8" />
      <circle cx="46" cy="46" r="3.5" fill="#38BDF8" />
      <circle cx="18" cy="32" r="3" fill="#FFFFFF" />
      <defs>
        <linearGradient id="cosy_mono_grad" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Concept 3 — Pure mono C emblem */
function MonoMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect width="64" height="64" rx="12" className="fill-white dark:fill-white" fill="#FFFFFF" />
      <path d="M16 16H48V22.4H22.4V41.6H48V48H16V16Z" fill="#09090B" />
      <rect x="38.4" y="28.8" width="9.6" height="6.4" rx="1.2" fill="#09090B" />
    </svg>
  );
}

function Mark({ variant, size }: { variant: CosyLogoVariant; size: number }) {
  if (variant === "monogram") return <MonogramMark size={size} />;
  if (variant === "mono") return <MonoMark size={size} />;
  return <SpatialMark size={size} />;
}

/**
 * COSY.AI brand logo — Spatial AST mark + geometric wordmark.
 * Linear / Vercel / Figma grade. Zero image assets.
 */
export const CosyLogo: React.FC<CosyLogoProps> = ({
  className,
  size = 40,
  showWordmark = true,
  showSubtitle = true,
  variant = "spatial",
  decorative = false,
}) => {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-3",
        !showWordmark && "gap-0",
        className,
      )}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      aria-label={
        decorative ? undefined : showWordmark ? "COSY.AI Visual Code Engine" : "COSY.AI"
      }
    >
      <Mark variant={variant} size={size} />

      {showWordmark && (
        <div className="flex min-w-0 flex-col leading-none">
          <span className="font-brand text-xl font-extrabold tracking-tight text-foreground">
            COSY
            <span className="text-brand-indigo">.AI</span>
          </span>
          {showSubtitle && (
            <span className="font-brand mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Visual Code Engine
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CosyLogo;
