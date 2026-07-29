import { describe, it, expect } from "vitest";
import { CRDTMultiplayerEngine } from "./crdtEngine";
import type { RawNode } from "../semantic-intent/types";

describe("CRDTMultiplayerEngine fine-grained patching", () => {
  it("initializes empty and accepts first AST without wipe", () => {
    const engine = new CRDTMultiplayerEngine();
    const nodes: RawNode[] = [
      { id: "a", type: "box", className: "p-2" },
      { id: "b", type: "button", text: "Go" },
    ];
    engine.updateAST(nodes);
    expect(engine.getNodes().map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("updates a single node in place without dropping siblings", () => {
    const engine = new CRDTMultiplayerEngine();
    engine.updateAST([
      { id: "a", type: "box", className: "p-2" },
      { id: "b", type: "button", text: "Go", className: "bg-blue-500" },
      { id: "c", type: "text", text: "Keep" },
    ]);

    engine.updateAST([
      { id: "a", type: "box", className: "p-2" },
      { id: "b", type: "button", text: "Go", className: "bg-red-500" },
      { id: "c", type: "text", text: "Keep" },
    ]);

    const nodes = engine.getNodes();
    expect(nodes).toHaveLength(3);
    expect(nodes[1].className).toBe("bg-red-500");
    expect(nodes[2].text).toBe("Keep");
  });

  it("removes deleted ids without clearing the whole array", () => {
    const engine = new CRDTMultiplayerEngine();
    engine.updateAST([
      { id: "a", type: "box" },
      { id: "b", type: "box" },
      { id: "c", type: "box" },
    ]);
    engine.updateAST([
      { id: "a", type: "box" },
      { id: "c", type: "box" },
    ]);
    expect(engine.getNodes().map((n) => n.id)).toEqual(["a", "c"]);
  });

  it("inserts new nodes at the correct order", () => {
    const engine = new CRDTMultiplayerEngine();
    engine.updateAST([
      { id: "a", type: "box" },
      { id: "c", type: "box" },
    ]);
    engine.updateAST([
      { id: "a", type: "box" },
      { id: "b", type: "box" },
      { id: "c", type: "box" },
    ]);
    expect(engine.getNodes().map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("is idempotent for identical AST payloads", () => {
    const engine = new CRDTMultiplayerEngine();
    const nodes: RawNode[] = [
      { id: "x", type: "text", text: "Hello" },
      { id: "y", type: "button", text: "OK" },
    ];
    engine.updateAST(nodes);
    engine.updateAST(nodes);
    engine.updateAST(structuredClone(nodes));
    expect(engine.getNodes()).toEqual(nodes);
  });
});
