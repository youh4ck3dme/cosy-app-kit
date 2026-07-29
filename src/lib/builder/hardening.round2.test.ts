/**
 * Regression tests for the Phase 04.5.2 pre-Canvas audit patches.
 * See .nexify-forge/reports/PHASE_04_5_2_PRE_CANVAS_KERNEL_AUDIT.md for the findings these close.
 */
import { describe, expect, it } from "vitest";

import type { CommandResult, ICommand } from "@/lib/builder/commands/command.interface";
import { AddNodeCommand } from "@/lib/builder/commands/impl/addNode.command";
import { UpdatePropertyCommand } from "@/lib/builder/commands/impl/updateProperty.command";
import {
  createDefaultDocument,
  createNodeFromDefaults,
} from "@/lib/builder/document/documentFactory";
import { validateDocument } from "@/lib/builder/document/documentInvariants";
import type { BuilderDocument } from "@/lib/builder/document/document.types";
import { BuilderKernel } from "@/lib/builder/kernel/builderKernel";
import { bootstrapBuilderKernel } from "@/lib/builder/kernel/kernelFacade";
import { NodeRegistry } from "@/lib/builder/registry/nodeRegistry";

describe("hardening round 2 — pre-Canvas patches", () => {
  it("B1 (CRITICAL-1 root fix): UPDATE_PROPERTY rejects a function value instead of bricking the kernel", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;

    const result = k.dispatch(
      new UpdatePropertyCommand({ nodeId: rootId, path: "props.fn", value: () => 1 }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not serializable/i);

    // Kernel must remain fully usable afterward — no bricking.
    expect(() => k.getDocument()).not.toThrow();
    const followUp = k.dispatch(
      new UpdatePropertyCommand({ nodeId: rootId, path: "props.x", value: "ok" }),
    );
    expect(followUp.success).toBe(true);
  });

  it("B1b: UPDATE_PROPERTY rejects a nested non-cloneable value", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;

    const result = k.dispatch(
      new UpdatePropertyCommand({
        nodeId: rootId,
        path: "props.nested",
        value: { safe: 1, hidden: () => "boom" },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not serializable/i);
    expect(() => k.getDocument()).not.toThrow();
  });

  it("B1c: UPDATE_PROPERTY still accepts ordinary JSON-safe values", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    const result = k.dispatch(
      new UpdatePropertyCommand({
        nodeId: rootId,
        path: "props.text",
        value: { a: 1, b: ["x", "y"], c: { d: null } },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("B2 (CRITICAL-1 defense-in-depth): kernel degrades gracefully, not permanently, if some other command smuggles a non-cloneable value", () => {
    const hostileCommand: ICommand = {
      id: "hostile-smuggle",
      type: "HOSTILE_SMUGGLE",
      timestamp: 0,
      payload: {},
      execute(document: BuilderDocument): CommandResult {
        const root = document.tree.nodes[document.tree.rootId]!;
        (root.props as Record<string, unknown>).evil = () => "smuggled";
        return { success: true, mutatedNodeIds: [root.id] };
      },
      undo(): CommandResult {
        return { success: true, mutatedNodeIds: [] };
      },
      serialize() {
        return { id: this.id, type: this.type, timestamp: 0, payload: {} };
      },
    };

    const k = new BuilderKernel(createDefaultDocument());
    const poisoning = k.dispatch(hostileCommand);
    expect(poisoning.success).toBe(true); // the hostile command itself isn't the kernel's guard point

    // Every subsequent kernel operation must fail gracefully, not throw uncaught, and not hang forever.
    const nextDispatch = k.dispatch(
      new AddNodeCommand({
        parentId: "root_missing_or_poisoned",
        node: createNodeFromDefaults("Text", "t", null, { id: "t1" }),
      }),
    );
    expect(nextDispatch.success).toBe(false);
    expect(nextDispatch.error).toMatch(/snapshot|clone/i);

    const undoResult = k.undo();
    expect(undoResult.success).toBe(false);
    expect(undoResult.error).toMatch(/snapshot|clone/i);
  });

  it("B3a (CRITICAL-2 correctness): a self-loop is still detected as CYCLE_FOUND after the O(n) rewrite", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    const looped = createNodeFromDefaults("Container", "loop", rootId, { id: "loop" });
    looped.parentId = "loop"; // self-loop
    doc.tree.nodes["loop"] = looped;
    doc.tree.nodes[rootId]!.children.push("loop");

    const result = validateDocument(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "CYCLE_FOUND" && i.nodeId === "loop")).toBe(true);
  });

  it("B3b (CRITICAL-2 correctness): a multi-node cycle disjoint from root is still detected", () => {
    const doc = createDefaultDocument();
    const a = createNodeFromDefaults("Container", "a", "b", { id: "a" });
    const b = createNodeFromDefaults("Container", "b", "a", { id: "b" });
    doc.tree.nodes["a"] = a;
    doc.tree.nodes["b"] = b;

    const result = validateDocument(doc);
    expect(result.ok).toBe(false);
    const cyclicIds = result.issues.filter((i) => i.code === "CYCLE_FOUND").map((i) => i.nodeId);
    expect(cyclicIds).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("B3c (CRITICAL-2 performance): validateDocument stays sub-linear-feeling on a 10,000-deep chain", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    let lastId = rootId;
    for (let i = 0; i < 10_000; i += 1) {
      const node = createNodeFromDefaults("Container", `n${i}`, lastId, { id: `n${i}` });
      doc.tree.nodes[node.id] = node;
      doc.tree.nodes[lastId]!.children.push(node.id);
      lastId = node.id;
    }

    const start = performance.now();
    const result = validateDocument(doc);
    const elapsed = performance.now() - start;

    expect(result.ok).toBe(true);
    // Pre-fix this took ~5000ms (O(n * depth)); post-fix it's ~10-20ms (O(n)).
    // Budget is generous to avoid CI flakiness while still catching a regression to quadratic behavior.
    expect(elapsed).toBeLessThan(500);
  });

  it("B4 (HIGH-3): plugin eventBus view cannot emit or clear kernel events", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    const seen: unknown[] = [];
    session.eventBus.subscribe("COMMAND_EXECUTED", (e) => seen.push(e.payload));

    let sawEmit: unknown;
    let sawClear: unknown;
    session.pluginRegistry.register({
      id: "evil",
      name: "evil",
      version: "1.0.0",
      register(kernel) {
        sawEmit = (kernel.eventBus as unknown as { emit?: unknown }).emit;
        sawClear = (kernel.eventBus as unknown as { clear?: unknown }).clear;
        expect(typeof kernel.eventBus.subscribe).toBe("function");
      },
    });

    expect(sawEmit).toBeUndefined();
    expect(sawClear).toBeUndefined();

    // Real dispatch still reaches the host's real listener untouched.
    const rootId = session.kernel.getDocument().tree.rootId;
    session.kernel.dispatch(
      new UpdatePropertyCommand({ nodeId: rootId, path: "props.x", value: "real" }),
    );
    expect(seen.length).toBe(1);
  });

  it("B5 (HIGH-4): transaction() callback throw returns a failure result instead of throwing", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    const beforeVersion = k.getDocument().metadata.version;

    let result: ReturnType<BuilderKernel["transaction"]> | undefined;
    expect(() => {
      result = k.transaction((tx) => {
        tx.dispatch(
          new AddNodeCommand({
            parentId: rootId,
            node: createNodeFromDefaults("Text", "ok", rootId, { id: "ok1" }),
          }),
        );
        throw new Error("callback exploded mid-build");
      });
    }).not.toThrow();

    expect(result?.success).toBe(false);
    expect(result?.error).toMatch(/callback exploded/);
    expect(k.getDocument().metadata.version).toBe(beforeVersion);
    expect(k.getDocument().tree.nodes.ok1).toBeUndefined();

    // Kernel must remain usable — transactionDepth reset correctly.
    const after = k.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "ok2", rootId, { id: "ok2" }),
      }),
    );
    expect(after.success).toBe(true);
  });

  it("B6 (final-review blocker): undo() catches an exception thrown by command.undo() and returns a failure result", () => {
    const throwsOnUndo: ICommand = {
      id: "throws-on-undo",
      type: "THROWS_ON_UNDO",
      timestamp: 0,
      payload: {},
      execute(document: BuilderDocument): CommandResult {
        document.metadata.title = "mutated";
        return { success: true, mutatedNodeIds: [] };
      },
      undo(): CommandResult {
        throw new Error("undo exploded");
      },
      serialize() {
        return { id: this.id, type: this.type, timestamp: 0, payload: {} };
      },
    };

    const k = new BuilderKernel(createDefaultDocument({ title: "clean" }));
    expect(k.dispatch(throwsOnUndo).success).toBe(true);

    let result: ReturnType<BuilderKernel["undo"]> | undefined;
    expect(() => {
      result = k.undo();
    }).not.toThrow();

    expect(result?.success).toBe(false);
    expect(result?.error).toMatch(/undo exploded/);
    // Document restored to its pre-undo-attempt snapshot (post-dispatch state, unmutated by the failed undo).
    expect(k.getDocument().metadata.title).toBe("mutated");
    // History consistency: the entry is pushed back onto the undo stack, not lost.
    expect(k.getHistory().canUndo()).toBe(true);

    // Kernel remains usable afterward.
    const rootId = k.getDocument().tree.rootId;
    const followUp = k.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "ok", rootId, { id: "ok1" }),
      }),
    );
    expect(followUp.success).toBe(true);
  });

  it("B7 (final-review blocker): redo() catches an exception thrown by command.execute() and returns a failure result", () => {
    let executeCalls = 0;
    const throwsOnSecondExecute: ICommand = {
      id: "throws-on-redo",
      type: "THROWS_ON_REDO",
      timestamp: 0,
      payload: {},
      execute(document: BuilderDocument): CommandResult {
        executeCalls += 1;
        if (executeCalls > 1) {
          throw new Error("redo exploded");
        }
        document.metadata.title = "mutated";
        return { success: true, mutatedNodeIds: [] };
      },
      undo(document: BuilderDocument): CommandResult {
        document.metadata.title = "clean";
        return { success: true, mutatedNodeIds: [] };
      },
      serialize() {
        return { id: this.id, type: this.type, timestamp: 0, payload: {} };
      },
    };

    const k = new BuilderKernel(createDefaultDocument({ title: "clean" }));
    expect(k.dispatch(throwsOnSecondExecute).success).toBe(true);
    expect(k.undo().success).toBe(true);
    expect(k.getDocument().metadata.title).toBe("clean");

    let result: ReturnType<BuilderKernel["redo"]> | undefined;
    expect(() => {
      result = k.redo();
    }).not.toThrow();

    expect(result?.success).toBe(false);
    expect(result?.error).toMatch(/redo exploded/);
    // Document restored to its pre-redo-attempt snapshot (post-undo state, unmutated by the failed redo).
    expect(k.getDocument().metadata.title).toBe("clean");
    // History consistency: the entry is pushed back onto the redo stack, not lost.
    expect(k.getHistory().canRedo()).toBe(true);

    // Kernel remains usable afterward.
    const rootId = k.getDocument().tree.rootId;
    const followUp = k.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "ok", rootId, { id: "ok1" }),
      }),
    );
    expect(followUp.success).toBe(true);
  });
});
