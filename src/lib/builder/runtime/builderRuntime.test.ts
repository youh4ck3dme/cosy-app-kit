import { describe, expect, it } from "vitest";

import { AddNodeCommand } from "../commands/impl/addNode.command";
import { createNodeFromDefaults } from "../document/documentFactory";
import { createBuilderRuntime } from "./builderRuntime";

describe("BuilderRuntime (ADR-0005 Slice A)", () => {
  it("creates a session with a readonly default document", () => {
    const runtime = createBuilderRuntime();
    expect(runtime.disposed).toBe(false);
    expect(runtime.id.length).toBeGreaterThan(0);

    const doc = runtime.getReadonlyDocument();
    expect(doc.tree.rootId).toBeTruthy();
    expect(Object.keys(doc.tree.nodes).length).toBe(1);

    // Frozen / sealed — mutating props must throw in strict mode or be a no-op isolation.
    expect(() => {
      (doc.tree.nodes[doc.tree.rootId] as { name?: string }).name = "hacked";
    }).toThrow();

    runtime.dispose();
  });

  it("dispatches, undoes, and redoes without leaking kernel", () => {
    const runtime = createBuilderRuntime();
    const rootId = runtime.getReadonlyDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "Slice A", rootId, {
      props: { text: "hello runtime" },
    });

    const added = runtime.dispatch(new AddNodeCommand({ parentId: rootId, node }));
    expect(added.success).toBe(true);
    expect(runtime.canUndo()).toBe(true);
    expect(runtime.canRedo()).toBe(false);
    expect(
      Object.values(runtime.getReadonlyDocument().tree.nodes).some(
        (n) => n.props.text === "hello runtime",
      ),
    ).toBe(true);

    // Facade must not expose live kernel / registries on the public object.
    expect(runtime).not.toHaveProperty("kernel");
    expect(runtime).not.toHaveProperty("session");
    expect(runtime).not.toHaveProperty("eventBus");
    expect(runtime).not.toHaveProperty("pluginRegistry");
    expect(Object.keys(runtime).sort()).toEqual(["id"].sort());

    expect(runtime.undo().success).toBe(true);
    expect(
      Object.values(runtime.getReadonlyDocument().tree.nodes).some(
        (n) => n.props.text === "hello runtime",
      ),
    ).toBe(false);
    expect(runtime.canRedo()).toBe(true);

    expect(runtime.redo().success).toBe(true);
    expect(
      Object.values(runtime.getReadonlyDocument().tree.nodes).some(
        (n) => n.props.text === "hello runtime",
      ),
    ).toBe(true);

    runtime.dispose();
  });

  it("dispose is idempotent and blocks further use", () => {
    const runtime = createBuilderRuntime();
    runtime.dispose();
    expect(runtime.disposed).toBe(true);
    runtime.dispose(); // second call must not throw
    expect(runtime.disposed).toBe(true);

    expect(() => runtime.getReadonlyDocument()).toThrow(/disposed/i);
    expect(() => runtime.canUndo()).toThrow(/disposed/i);
    expect(() => runtime.undo()).toThrow(/disposed/i);
    expect(() => runtime.redo()).toThrow(/disposed/i);

    const rootId = "root";
    const node = createNodeFromDefaults("Text", "after dispose", rootId, {
      props: { text: "nope" },
    });
    expect(() => runtime.dispatch(new AddNodeCommand({ parentId: rootId, node }))).toThrow(
      /disposed/i,
    );
  });

  it("does not return BootstrappedKernel-shaped handles from the factory", () => {
    const runtime = createBuilderRuntime();
    // Public surface is the facade interface only.
    expect(typeof runtime.getReadonlyDocument).toBe("function");
    expect(typeof runtime.dispatch).toBe("function");
    expect(typeof runtime.undo).toBe("function");
    expect(typeof runtime.redo).toBe("function");
    expect(typeof runtime.dispose).toBe("function");
    expect("kernel" in runtime).toBe(false);
    runtime.dispose();
  });
});
