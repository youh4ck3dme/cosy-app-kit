import { describe, expect, it } from "vitest";

import { shouldEnableAutoAnimate } from "./auto-animate-gate";

describe("shouldEnableAutoAnimate", () => {
  it("enables when the user has no reduced-motion preference and Speed mode is off", () => {
    expect(shouldEnableAutoAnimate({ prefersReducedMotion: false, speedMode: false })).toBe(true);
  });

  it("disables when prefers-reduced-motion is set", () => {
    expect(shouldEnableAutoAnimate({ prefersReducedMotion: true, speedMode: false })).toBe(false);
  });

  it("disables when Speed mode is on", () => {
    expect(shouldEnableAutoAnimate({ prefersReducedMotion: false, speedMode: true })).toBe(false);
  });

  it("disables when both signals say to skip decorative motion", () => {
    expect(shouldEnableAutoAnimate({ prefersReducedMotion: true, speedMode: true })).toBe(false);
  });
});
