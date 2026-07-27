/**
 * Apple iPhone 17 Air (iPhone Air) — CSS viewport & layout contract.
 *
 * Sources (2025–2026 device charts):
 * - CSS viewport: 420 × 912
 * - Physical: 1260 × 2736 @ 3x (~460 ppi)
 * - Safe area (portrait): top 68, bottom 34
 *
 * Used for mobile-first canvas QA and responsive auto-fix gates.
 */
export const IPHONE_17_AIR = {
  id: "iphone-17-air",
  name: "iPhone 17 Air",
  /** CSS layout viewport (points / CSS px) */
  viewport: {
    width: 420,
    height: 912,
  },
  /** Physical pixels */
  physical: {
    width: 1260,
    height: 2736,
  },
  devicePixelRatio: 3,
  ppi: 460,
  screenInches: 6.5,
  safeAreaPortrait: {
    top: 68,
    bottom: 34,
    left: 0,
    right: 0,
  },
  safeAreaLandscape: {
    top: 20,
    bottom: 29,
    left: 68,
    right: 68,
  },
  /** Tailwind-friendly frame label for Live Canvas chrome */
  frameLabel: "420 × 912",
  /** Aspect ratio ≈ 420/912 */
  aspectRatio: 420 / 912,
  /**
   * Max fixed-width class (px) that still fits without horizontal overflow
   * when using w-[Npx] without responsive rewrites.
   */
  maxFixedWidthPx: 420,
} as const;

export type IPhone17AirProfile = typeof IPHONE_17_AIR;

/** True if a CSS pixel width would overflow the iPhone 17 Air layout viewport. */
export function overflowsIPhone17AirWidth(cssWidthPx: number): boolean {
  return cssWidthPx > IPHONE_17_AIR.viewport.width;
}

/**
 * Extract rigid Tailwind arbitrary widths: w-[1200px], max-w-[900px], etc.
 */
export function extractArbitraryPxWidths(className: string): number[] {
  const matches = className.matchAll(/(?:^|\s)(?:max-)?w-\[(\d+)px\]/g);
  const values: number[] = [];
  for (const m of matches) {
    values.push(Number(m[1]));
  }
  return values;
}

/**
 * Returns true if className contains a rigid width that exceeds iPhone 17 Air.
 * Ignores max-w-* (those cap width) and responsive prefixes we don't parse fully —
 * only bare w-[Npx] without a preceding breakpoint is treated as dangerous.
 */
export function hasRigidWidthOverflowForIPhone17Air(className: string): boolean {
  // Split tokens; only bare w-[Npx] (not md:w-[…]) counts as mobile-breaking
  const tokens = className.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.includes(":") && !token.startsWith("w-[")) {
      // responsive variant like md:w-[1200px] — OK on small screens if base is fluid
      continue;
    }
    const bare = token.match(/^w-\[(\d+)px\]$/);
    if (bare) {
      const n = Number(bare[1]);
      if (overflowsIPhone17AirWidth(n)) return true;
    }
  }
  return false;
}

/**
 * Available content height inside the portrait safe area (status + home indicator).
 */
export function iPhone17AirSafeContentHeight(): number {
  const { height } = IPHONE_17_AIR.viewport;
  const { top, bottom } = IPHONE_17_AIR.safeAreaPortrait;
  return height - top - bottom;
}

/**
 * CSS env() style string matching iPhone 17 Air portrait safe areas
 * (for sandbox preview chrome / test fixtures).
 */
export function iPhone17AirSafeAreaCssVars(): string {
  const s = IPHONE_17_AIR.safeAreaPortrait;
  return [
    `--sat: ${s.top}px`,
    `--sab: ${s.bottom}px`,
    `--sal: ${s.left}px`,
    `--sar: ${s.right}px`,
  ].join("; ");
}
