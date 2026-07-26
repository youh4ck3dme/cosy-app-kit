import { describe, expect, it } from "vitest";

import { createDefaultDocument } from "../document/documentFactory";
import { InMemoryRuntimePersistence } from "./persistence";

describe("InMemoryRuntimePersistence (ADR-0005 Slice B)", () => {
  it("load() returns null when nothing has been saved yet", async () => {
    const store = new InMemoryRuntimePersistence();
    await expect(store.load()).resolves.toBeNull();
  });

  it("round-trips a document through save() then load()", async () => {
    const store = new InMemoryRuntimePersistence();
    const doc = createDefaultDocument({ title: "Persisted" });

    await store.save(doc);
    const loaded = await store.load();

    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.title).toBe("Persisted");
    expect(loaded?.tree.rootId).toBe(doc.tree.rootId);
  });

  it("clones on save — mutating the caller's object afterward does not affect the store", async () => {
    const store = new InMemoryRuntimePersistence();
    const doc = createDefaultDocument({ title: "Original" });

    await store.save(doc);
    doc.metadata.title = "Mutated after save";

    const loaded = await store.load();
    expect(loaded?.metadata.title).toBe("Original");
  });

  it("clones on load — mutating one loaded snapshot does not affect the next load()", async () => {
    const store = new InMemoryRuntimePersistence();
    await store.save(createDefaultDocument({ title: "Stable" }));

    const first = await store.load();
    expect(first).not.toBeNull();
    first!.metadata.title = "Mutated after load";

    const second = await store.load();
    expect(second?.metadata.title).toBe("Stable");
  });

  it("a later save() overwrites the previously stored document", async () => {
    const store = new InMemoryRuntimePersistence();
    await store.save(createDefaultDocument({ title: "First" }));
    await store.save(createDefaultDocument({ title: "Second" }));

    const loaded = await store.load();
    expect(loaded?.metadata.title).toBe("Second");
  });
});
