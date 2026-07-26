import { describe, it, expect } from "vitest";
import { Detector } from "./detector";
import type { RawNode } from "./types";

describe("Detector (Unit Tests)", () => {
  const detector = new Detector();

  it("should detect FormIntent when inputs and a submit button are present", () => {
    const nodes: RawNode[] = [
      { id: "1", type: "input", inputType: "text" },
      { id: "2", type: "button", action: "submit" },
    ];
    expect(detector.detectIntent(nodes)).toBe("FormIntent");
  });

  it("should detect NavigationIntent when a list is present", () => {
    const nodes: RawNode[] = [{ id: "1", type: "list" }];
    expect(detector.detectIntent(nodes)).toBe("NavigationIntent");
  });

  it("should detect NavigationIntent when navigation buttons are present", () => {
    const nodes: RawNode[] = [{ id: "1", type: "button", action: "navigate" }];
    expect(detector.detectIntent(nodes)).toBe("NavigationIntent");
  });

  it("should detect StaticIntent when no specific interactive patterns are found", () => {
    const nodes: RawNode[] = [
      { id: "1", type: "text", text: "Hello" },
      { id: "2", type: "box" },
    ];
    expect(detector.detectIntent(nodes)).toBe("StaticIntent");
  });
});
