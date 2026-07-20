import { describe, expect, it } from "vitest";
import { haptic } from "@/lib/haptics";

describe("haptic", () => {
  it("does not throw when vibration is unsupported", () => {
    expect(() => haptic()).not.toThrow();
    expect(() => haptic([10, 30, 10])).not.toThrow();
  });
});
