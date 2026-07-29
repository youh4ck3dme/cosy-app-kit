import { describe, expect, it } from "vitest";

import { AddNodeCommand } from "../commands/impl/addNode.command";
import { createNodeFromDefaults } from "../document/documentFactory";
import type { BuilderDocument } from "../document/document.types";
import { createBuilderRuntime } from "./builderRuntime";
import { InMemoryRuntimePersistence, type RuntimePersistence } from "./persistence";

function makeDelayedPersistence(doc: BuilderDocument | null, delayMs = 10): RuntimePersistence {
  return {
    load: () => new Promise((resolve) => setTimeout(() => resolve(doc), delayMs)),
    save: async () => {},
  };
}

describe("BuilderRuntime persistence (ADR-0005 Slice B)", () => {
  it("save → new runtime → load round-trips the document", async () => {
    const store = new InMemoryRuntimePersistence();

    const first = createBuilderRuntime({ persistence: store });
    const rootId = first.getReadonlyDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "Slice B", rootId, {
      props: { text: "saved from first runtime" },
    });
    expect(first.dispatch(new AddNodeCommand({ parentId: rootId, node })).success).toBe(true);

    await first.saveToStore();
    first.dispose();

    const second = createBuilderRuntime({ persistence: store });
    const loaded = await second.loadFromStore();
    expect(loaded).toBe(true);

    expect(
      Object.values(second.getReadonlyDocument().tree.nodes).some(
        (n) => n.props.text === "saved from first runtime",
      ),
    ).toBe(true);

    second.dispose();
  });

  it("loadFromStore() is a no-op and returns false when nothing was saved", async () => {
    const runtime = createBuilderRuntime({ persistence: new InMemoryRuntimePersistence() });
    const before = runtime.getReadonlyDocument();

    const loaded = await runtime.loadFromStore();
    expect(loaded).toBe(false);
    expect(runtime.getReadonlyDocument().tree.rootId).toBe(before.tree.rootId);

    runtime.dispose();
  });

  it("loadFromStore()/saveToStore() throw a clear error when no persistence port is configured", async () => {
    const runtime = createBuilderRuntime();
    await expect(runtime.loadFromStore()).rejects.toThrow(/no persistence configured/i);
    await expect(runtime.saveToStore()).rejects.toThrow(/no persistence configured/i);
    runtime.dispose();
  });

  it("dispose safety: loadFromStore()/saveToStore() throw after dispose()", async () => {
    const runtime = createBuilderRuntime({ persistence: new InMemoryRuntimePersistence() });
    runtime.dispose();

    await expect(runtime.loadFromStore()).rejects.toThrow(/disposed/i);
    await expect(runtime.saveToStore()).rejects.toThrow(/disposed/i);
  });

  it("dispose() during an in-flight loadFromStore() is not silently resurrected", async () => {
    const staleDoc = createBuilderRuntime().getReadonlyDocument();
    const persistence = makeDelayedPersistence(staleDoc, 20);
    const runtime = createBuilderRuntime({ persistence });

    const pending = runtime.loadFromStore();
    runtime.dispose(); // dispose while load() is still in flight

    await expect(pending).rejects.toThrow(/disposed/i);
    expect(runtime.disposed).toBe(true);
  });

  it("does not leak the persistence port on the public facade", () => {
    const runtime = createBuilderRuntime({ persistence: new InMemoryRuntimePersistence() });
    expect(runtime).not.toHaveProperty("persistence");
    expect(Object.keys(runtime).sort()).toEqual(["id"].sort());
    runtime.dispose();
  });
});
