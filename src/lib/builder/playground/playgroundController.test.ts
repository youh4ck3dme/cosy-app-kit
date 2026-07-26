import { describe, expect, it } from "vitest";

import { BuilderPlaygroundController } from "./playgroundController";

describe("BuilderPlaygroundController", () => {
  it("starts with a valid default document", () => {
    const playground = new BuilderPlaygroundController();
    const snap = playground.getSnapshot();
    expect(snap.validation.ok).toBe(true);
    expect(snap.canUndo).toBe(false);
    expect(snap.canRedo).toBe(false);
    expect(Object.keys(snap.document.tree.nodes).length).toBe(1);
    playground.dispose();
  });

  it("adds a text node, records history, and undoes", () => {
    const playground = new BuilderPlaygroundController();
    const result = playground.addTextNode("Hello playground");
    expect(result.success).toBe(true);

    let snap = playground.getSnapshot();
    expect(snap.validation.ok).toBe(true);
    expect(snap.canUndo).toBe(true);
    expect(snap.historyLog.some((e) => e.type === "ADD_NODE")).toBe(true);
    expect(
      Object.values(snap.document.tree.nodes).some(
        (n) => n.props.text === "Hello playground",
      ),
    ).toBe(true);

    expect(playground.undo().success).toBe(true);
    snap = playground.getSnapshot();
    expect(
      Object.values(snap.document.tree.nodes).some(
        (n) => n.props.text === "Hello playground",
      ),
    ).toBe(false);
    expect(snap.canRedo).toBe(true);
    playground.dispose();
  });

  it("captures COMMAND_EXECUTED on the event bus log", () => {
    const playground = new BuilderPlaygroundController();
    playground.addTextNode("event probe");
    const snap = playground.getSnapshot();
    expect(snap.events.some((e) => e.type === "COMMAND_EXECUTED")).toBe(true);
    playground.clearEvents();
    expect(playground.getSnapshot().events).toHaveLength(0);
    playground.dispose();
  });

  it("updates a property on the root node", () => {
    const playground = new BuilderPlaygroundController();
    const rootId = playground.getSnapshot().document.tree.rootId;
    const result = playground.updateNodeProp(rootId, "props.label", "Root label");
    expect(result.success).toBe(true);
    expect(playground.getSnapshot().document.tree.nodes[rootId]?.props.label).toBe(
      "Root label",
    );
    playground.dispose();
  });

  it("notifies subscribers on mutation", () => {
    const playground = new BuilderPlaygroundController();
    let calls = 0;
    const unsub = playground.subscribe(() => {
      calls += 1;
    });
    playground.addTextNode("notify");
    expect(calls).toBeGreaterThan(0);
    unsub();
    playground.dispose();
  });

  it("resetDocument restores a clean tree", () => {
    const playground = new BuilderPlaygroundController();
    playground.addTextNode("temp");
    playground.resetDocument();
    const snap = playground.getSnapshot();
    expect(Object.keys(snap.document.tree.nodes)).toHaveLength(1);
    expect(snap.canUndo).toBe(false);
    expect(snap.validation.ok).toBe(true);
    playground.dispose();
  });
});
