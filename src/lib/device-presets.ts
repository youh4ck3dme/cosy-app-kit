/**
 * Named device presets for Canvas preview + shell QA.
 * Widths are CSS viewport pixels (what @media queries see).
 */

export type DevicePresetId =
  | "iphone-17-air"
  | "iphone-17-pro"
  | "iphone-17-pro-max"
  | "iphone-15"
  | "iphone-se"
  | "mobile-generic"
  | "ipad-air"
  | "tablet"
  | "desktop";

export type DevicePreset = {
  id: DevicePresetId;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  category: "phone" | "tablet" | "desktop";
};

/** Curated presets — iPhone 17 Air first (420×912 CSS per Apple HIG). */
export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: "iphone-17-air",
    label: "iPhone 17 Air",
    shortLabel: "17 Air",
    width: 420,
    height: 912,
    category: "phone",
  },
  {
    id: "iphone-17-pro-max",
    label: "iPhone 17 Pro Max",
    shortLabel: "17 Pro Max",
    width: 440,
    height: 956,
    category: "phone",
  },
  {
    id: "iphone-17-pro",
    label: "iPhone 17 Pro",
    shortLabel: "17 Pro",
    width: 402,
    height: 874,
    category: "phone",
  },
  {
    id: "iphone-15",
    label: "iPhone 15 / 16",
    shortLabel: "15/16",
    width: 393,
    height: 852,
    category: "phone",
  },
  {
    id: "iphone-se",
    label: "iPhone SE",
    shortLabel: "SE",
    width: 375,
    height: 667,
    category: "phone",
  },
  {
    id: "mobile-generic",
    label: "Mobile (generic)",
    shortLabel: "390",
    width: 390,
    height: 844,
    category: "phone",
  },
  {
    id: "ipad-air",
    label: "iPad Air 11″",
    shortLabel: "iPad",
    width: 820,
    height: 1180,
    category: "tablet",
  },
  {
    id: "tablet",
    label: "Tablet",
    shortLabel: "768",
    width: 768,
    height: 1024,
    category: "tablet",
  },
  {
    id: "desktop",
    label: "Desktop",
    shortLabel: "1200",
    width: 1200,
    height: 800,
    category: "desktop",
  },
];

export const DEFAULT_DEVICE_PRESET_ID: DevicePresetId = "iphone-17-air";

const BY_ID = new Map(DEVICE_PRESETS.map((p) => [p.id, p]));

export function getDevicePreset(id: string | null | undefined): DevicePreset | null {
  if (!id) return null;
  return BY_ID.get(id as DevicePresetId) ?? null;
}

export function isDevicePresetId(v: unknown): v is DevicePresetId {
  return typeof v === "string" && BY_ID.has(v as DevicePresetId);
}

/** Best preset for current host width (phones → Air, tablets → iPad, else desktop). */
export function guessDevicePresetForHost(hostWidth: number): DevicePreset {
  if (hostWidth < 640) {
    const closest = DEVICE_PRESETS.filter((p) => p.category === "phone").reduce((best, p) => {
      const d = Math.abs(p.width - hostWidth);
      const bestD = Math.abs(best.width - hostWidth);
      return d < bestD ? p : best;
    });
    return closest;
  }
  if (hostWidth < 1024) {
    return getDevicePreset("ipad-air") ?? DEVICE_PRESETS[6]!;
  }
  return getDevicePreset("desktop") ?? DEVICE_PRESETS[8]!;
}

/** E2E / QA viewports — Speed & PWA shell checks across form factors. */
export const QA_VIEWPORTS: { name: string; width: number; height: number; presetId: DevicePresetId }[] =
  [
    { name: "iPhone 17 Air", width: 420, height: 912, presetId: "iphone-17-air" },
    { name: "iPhone 17 Pro", width: 402, height: 874, presetId: "iphone-17-pro" },
    { name: "iPhone 15", width: 393, height: 852, presetId: "iphone-15" },
    { name: "iPad Air", width: 820, height: 1180, presetId: "ipad-air" },
    { name: "Desktop", width: 1280, height: 800, presetId: "desktop" },
  ];
