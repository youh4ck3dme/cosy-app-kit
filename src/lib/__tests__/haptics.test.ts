import { describe, expect, test } from "bun:test";
import { haptic } from "../haptics";

describe("haptic", () => {
  test("does not throw when vibration is unsupported", () => {
    // Bun's navigator has no vibrate; the helper must silently no-op.
    expect(() => haptic()).not.toThrow();
    expect(() => haptic([10, 30, 10])).not.toThrow();
  });
});
