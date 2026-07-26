import { describe, it, expect } from "vitest";
import { StateInjector } from "./injector";
import type { RawNode } from "./types";

describe("StateInjector (Unit Tests)", () => {
  const injector = new StateInjector();

  it("should inject state keys and handlers for FormIntent", () => {
    const nodes: RawNode[] = [
      { id: "1", type: "input", name: "username" },
      { id: "2", type: "button", action: "submit" },
    ];

    const smartNodes = injector.injectState("FormIntent", nodes);

    expect(smartNodes[0].isInteractive).toBe(true);
    expect(smartNodes[0].stateKey).toBe("username");
    expect(smartNodes[0].eventHandlers?.onChange).toBe(true);

    expect(smartNodes[1].isInteractive).toBe(true);
    expect(smartNodes[1].eventHandlers?.onSubmit).toBe(true);
  });

  it("should NOT inject state logic for StaticIntent", () => {
    const nodes: RawNode[] = [
      { id: "1", type: "input", name: "username" }, 
      { id: "2", type: "text" },
    ];

    const smartNodes = injector.injectState("StaticIntent", nodes);

    expect(smartNodes[0].isInteractive).toBe(false);
    expect(smartNodes[0].stateKey).toBeUndefined();
    expect(smartNodes[1].isInteractive).toBe(false);
  });
});
