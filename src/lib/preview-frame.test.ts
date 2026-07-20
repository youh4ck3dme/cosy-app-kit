import { describe, expect, it } from "vitest";
import {
  computeFrame,
  defaultPreviewModeForHost,
  formatFrameBadge,
  migrateLegacyDevice,
} from "./preview-frame";

describe("defaultPreviewModeForHost", () => {
  it("fluid on phone, tablet mid, desktop wide", () => {
    expect(defaultPreviewModeForHost(390)).toBe("fluid");
    expect(defaultPreviewModeForHost(800)).toBe("tablet");
    expect(defaultPreviewModeForHost(1280)).toBe("desktop");
  });
});

describe("migrateLegacyDevice", () => {
  it("maps old device keys", () => {
    expect(migrateLegacyDevice("mobile")).toBe("mobile");
    expect(migrateLegacyDevice("desktop")).toBe("desktop");
    expect(migrateLegacyDevice("nope")).toBe(null);
  });
});

describe("computeFrame", () => {
  it("fluid uses host width, no sim", () => {
    const f = computeFrame({ mode: "fluid", hostWidth: 390, zoom: 1 });
    expect(f.mediaWidth).toBe(390);
    expect(f.fitScale).toBe(1);
    expect(f.simulated).toBe(false);
    expect(f.outerWidth).toBeCloseTo(390);
  });

  it("desktop on phone scales so media stays 1200", () => {
    const f = computeFrame({ mode: "desktop", hostWidth: 390, zoom: 1 });
    expect(f.mediaWidth).toBe(1200);
    expect(f.simulated).toBe(true);
    expect(f.fitScale).toBeCloseTo(390 / 1200);
    expect(f.outerWidth).toBeCloseTo(390);
  });

  it("tablet on wide host is 1:1", () => {
    const f = computeFrame({ mode: "tablet", hostWidth: 1000, zoom: 1 });
    expect(f.mediaWidth).toBe(768);
    expect(f.simulated).toBe(false);
    expect(f.outerWidth).toBe(768);
  });

  it("custom width overrides mode target", () => {
    const f = computeFrame({ mode: "mobile", hostWidth: 800, customWidth: 500, zoom: 1 });
    expect(f.mediaWidth).toBe(500);
  });

  it("zoom multiplies scale", () => {
    const f = computeFrame({ mode: "mobile", hostWidth: 800, zoom: 1.2 });
    expect(f.mediaWidth).toBe(390);
    expect(f.scale).toBeCloseTo(1.2);
    expect(f.outerWidth).toBeCloseTo(390 * 1.2);
  });
});

describe("formatFrameBadge", () => {
  it("shows sim badge when scaled", () => {
    const f = computeFrame({ mode: "desktop", hostWidth: 390 });
    expect(formatFrameBadge(f)).toMatch(/media 1200/);
  });

  it("fluid badge names fluid", () => {
    const f = computeFrame({ mode: "fluid", hostWidth: 402 });
    expect(formatFrameBadge(f)).toMatch(/fluid/);
  });
});

describe("computeFrame edge cases", () => {
  it("clamps media width to 280–1600", () => {
    const low = computeFrame({ mode: "fluid", hostWidth: 50, customWidth: 10 });
    expect(low.mediaWidth).toBe(280);
    const high = computeFrame({ mode: "fluid", hostWidth: 2000, customWidth: 9999 });
    expect(high.mediaWidth).toBe(1600);
  });

  it("mobile target is 390", () => {
    const f = computeFrame({ mode: "mobile", hostWidth: 1200 });
    expect(f.mediaWidth).toBe(390);
    expect(f.simulated).toBe(false);
  });

  it("tablet on phone is simulated", () => {
    const f = computeFrame({ mode: "tablet", hostWidth: 390 });
    expect(f.mediaWidth).toBe(768);
    expect(f.simulated).toBe(true);
    expect(f.outerWidth).toBeCloseTo(390, 0);
  });
});
