import { describe, expect, it } from "vitest";
import { estimateVersionBytes } from "@/lib/agent/versions";

describe("estimateVersionBytes", () => {
  it("sums content and files json", () => {
    const n = estimateVersionBytes(
      [{ path: "index.html", language: "html", content: "hello" }],
      "hello",
    );
    expect(n).toBeGreaterThan(5);
  });

  it("handles empty", () => {
    expect(estimateVersionBytes([], "")).toBeGreaterThanOrEqual(0);
  });
});
