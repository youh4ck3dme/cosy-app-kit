import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEVICE_PRESET_ID,
  DEVICE_PRESETS,
  getDevicePreset,
  guessDevicePresetForHost,
  isDevicePresetId,
  QA_VIEWPORTS,
} from "./device-presets";

describe("device-presets", () => {
  it("includes iPhone 17 Air at 420×912", () => {
    const air = getDevicePreset("iphone-17-air");
    expect(air?.width).toBe(420);
    expect(air?.height).toBe(912);
    expect(air?.label).toContain("17 Air");
  });

  it("default preset is iPhone 17 Air", () => {
    expect(DEFAULT_DEVICE_PRESET_ID).toBe("iphone-17-air");
  });

  it("validates preset ids", () => {
    expect(isDevicePresetId("iphone-17-air")).toBe(true);
    expect(isDevicePresetId("nope")).toBe(false);
  });

  it("guesses phone preset near host width", () => {
    expect(guessDevicePresetForHost(420).id).toBe("iphone-17-air");
    expect(guessDevicePresetForHost(390).id).toBe("mobile-generic");
    expect(guessDevicePresetForHost(820).id).toBe("ipad-air");
    expect(guessDevicePresetForHost(1400).id).toBe("desktop");
  });

  it("QA viewports cover key form factors", () => {
    expect(QA_VIEWPORTS.length).toBeGreaterThanOrEqual(4);
    expect(QA_VIEWPORTS.some((v) => v.presetId === "iphone-17-air")).toBe(true);
  });

  it("all presets have unique ids and sane dimensions", () => {
    const ids = new Set<string>();
    for (const p of DEVICE_PRESETS) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.width).toBeGreaterThanOrEqual(280);
      expect(p.height).toBeGreaterThanOrEqual(400);
    }
  });
});
