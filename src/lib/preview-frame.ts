/**
 * Pure math for Canvas device simulation (MR-40 M1).
 *
 * - fluid: iframe media width = host (honest phone layout)
 * - mobile/tablet/desktop: fixed media width; if host is narrower,
 *   CSS scale fits the frame so @media still sees the target width
 *   (not maxWidth:100% clamp which collapses MQ viewport).
 */

export type PreviewMode = "fluid" | "mobile" | "tablet" | "desktop";

export const PREVIEW_TARGETS: Record<Exclude<PreviewMode, "fluid">, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1200,
};

export const PREVIEW_MODES: PreviewMode[] = ["fluid", "mobile", "tablet", "desktop"];

export function isPreviewMode(v: unknown): v is PreviewMode {
  return v === "fluid" || v === "mobile" || v === "tablet" || v === "desktop";
}

/** Map legacy Canvas device strings + optional host width. */
export function defaultPreviewModeForHost(hostWidth?: number): PreviewMode {
  const w =
    typeof hostWidth === "number" && hostWidth > 0
      ? hostWidth
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1200;
  if (w < 640) return "fluid";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Old storage used device: desktop|tablet|mobile — map to PreviewMode. */
export function migrateLegacyDevice(device: string | undefined | null): PreviewMode | null {
  if (!device) return null;
  if (device === "desktop" || device === "tablet" || device === "mobile") return device;
  if (device === "fluid") return "fluid";
  return null;
}

export type FrameLayout = {
  /** Width the iframe layout / CSS media queries see (px). */
  mediaWidth: number;
  /** CSS transform scale applied to the inner frame (includes zoom). */
  scale: number;
  /** Fit scale before zoom (1 = no sim shrink). */
  fitScale: number;
  /** Outer box width after scale (px). */
  outerWidth: number;
  /** Iframe content height before scale (px). */
  iframeHeight: number;
  /** Outer box height for iframe area after scale (px). */
  outerIframeHeight: number;
  /** True when we scale down a larger device onto a smaller host. */
  simulated: boolean;
  mode: PreviewMode;
};

export function computeFrame(opts: {
  mode: PreviewMode;
  hostWidth: number;
  zoom?: number;
  customWidth?: number | null;
  /** Base iframe height before scale (default 720). */
  iframeHeight?: number;
}): FrameLayout {
  const zoom = opts.zoom && opts.zoom > 0 ? opts.zoom : 1;
  const hostW = Math.max(1, opts.hostWidth || 1);
  const iframeHeight = opts.iframeHeight && opts.iframeHeight > 0 ? opts.iframeHeight : 720;

  let mediaWidth: number;
  let mode = opts.mode;

  if (opts.customWidth && opts.customWidth > 0) {
    mediaWidth = Math.round(opts.customWidth);
  } else if (mode === "fluid") {
    mediaWidth = Math.round(hostW);
  } else {
    mediaWidth = PREVIEW_TARGETS[mode];
  }

  mediaWidth = Math.max(280, Math.min(1600, mediaWidth));

  const fitScale = mediaWidth > hostW ? hostW / mediaWidth : 1;
  const scale = fitScale * zoom;
  const simulated = fitScale < 0.999;

  return {
    mediaWidth,
    scale,
    fitScale,
    outerWidth: mediaWidth * scale,
    iframeHeight,
    outerIframeHeight: iframeHeight * scale,
    simulated,
    mode,
  };
}

export function formatFrameBadge(frame: FrameLayout): string {
  if (frame.mode === "fluid") return `${frame.mediaWidth}px · fluid`;
  if (frame.simulated) {
    return `media ${frame.mediaWidth} · ×${frame.fitScale.toFixed(2)}`;
  }
  return `${frame.mediaWidth}px · ${frame.mode}`;
}
