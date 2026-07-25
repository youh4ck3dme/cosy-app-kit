/**
 * Adversarial / red-team tests for kernel hardening.
 * These encode confirmed attack paths from GROK_KERNEL_RED_TEAM_AUDIT.md.
 */
import { describe, expect, it } from "vitest";

import { AddNodeCommand } from "@/lib/builder/commands/impl/addNode.command";
import { BatchCommand } from "@/lib/builder/commands/impl/batch.command";
import { UpdatePropertyCommand } from "@/lib/builder/commands/impl/updateProperty.command";
import type { ICommand, CommandResult } from "@/lib/builder/commands/command.interface";
import {
  createDefaultDocument,
  createNodeFromDefaults,
} from "@/lib/builder/document/documentFactory";
import { safeParseBuilderDocument } from "@/lib/builder/document/documentValidator";
import { BuilderKernel } from "@/lib/builder/kernel/builderKernel";
import { bootstrapBuilderKernel } from "@/lib/builder/kernel/kernelFacade";
import { IR_SCHEMA_VERSION, type UniversalDesignIR } from "@/lib/builder/imports/ir/ir.types";
import { IRToCommandCompiler } from "@/lib/builder/imports/ir/irToCommandCompiler";
import { NodeRegistry } from "@/lib/builder/registry/nodeRegistry";
import type { BuilderDocument } from "@/lib/builder/document/document.types";

function makeHostileMutateThenFail(title = "PARTIAL"): ICommand {
  return {
    id: "hostile-fail",
    type: "HOSTILE_FAIL",
    timestamp: 0,
    payload: {},
    execute(document: BuilderDocument): CommandResult {
      document.metadata.title = title;
      document.tree.nodes["ghost"] = createNodeFromDefaults("Text", "ghost", "nope", {
        id: "ghost",
      });
      return { success: false, mutatedNodeIds: [], error: "intentional fail after mutate" };
    },
    undo(): CommandResult {
      return { success: true, mutatedNodeIds: [] };
    },
    serialize() {
      return { id: this.id, type: this.type, timestamp: 0, payload: {} };
    },
  };
}

function makeMutateOkBrokenUndo(): ICommand {
  return {
    id: "mutate-ok",
    type: "MUTATE_OK",
    timestamp: 0,
    payload: {},
    execute(document: BuilderDocument): CommandResult {
      document.metadata.title = "batch-dirty";
      return { success: true, mutatedNodeIds: [] };
    },
    undo(): CommandResult {
      return { success: false, mutatedNodeIds: [], error: "undo broken" };
    },
    serialize() {
      return { id: this.id, type: this.type, timestamp: 0, payload: {} };
    },
  };
}

function makeAlwaysFail(): ICommand {
  return {
    id: "always-fail",
    type: "ALWAYS_FAIL",
    timestamp: 0,
    payload: {},
    execute(): CommandResult {
      return { success: false, mutatedNodeIds: [], error: "fail" };
    },
    undo(): CommandResult {
      return { success: true, mutatedNodeIds: [] };
    },
    serialize() {
      return { id: this.id, type: this.type, timestamp: 0, payload: {} };
    },
  };
}

describe("adversarial hardening", () => {
  it("A1: constructor does not alias caller document", () => {
    const doc = createDefaultDocument({ title: "orig" });
    const rootId = doc.tree.rootId;
    const k = new BuilderKernel(doc);
    doc.metadata.title = "MUTATED_VIA_ALIAS";
    doc.tree.nodes[rootId]!.props = { hacked: true };

    expect(k.getDocument().metadata.title).toBe("orig");
    expect(k.getDocument().tree.nodes[rootId]?.props).not.toEqual({ hacked: true });
  });

  it("A1b: constructor rejects corrupt document", () => {
    const base = createDefaultDocument();
    const bad = structuredClone(base);
    bad.tree.nodes.orphan = createNodeFromDefaults("Text", "o", "missing", { id: "orphan" });
    expect(() => new BuilderKernel(bad)).toThrow(/integrity|ORPHAN|INVALID/i);
  });

  it("A2: getDocument isolation + getReadonlyDocument freeze", () => {
    const k = new BuilderKernel(createDefaultDocument({ title: "Safe" }));
    const snap = k.getDocument();
    const rootId = snap.tree.rootId;
    snap.metadata.title = "HACK";
    (snap.tree.nodes[rootId]!.props as Record<string, unknown>).x = "evil";
    expect(k.getDocument().metadata.title).toBe("Safe");
    expect((k.getDocument().tree.nodes[rootId]!.props as Record<string, unknown>).x).toBeUndefined();

    const frozen = k.getReadonlyDocument();
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.tree.nodes[rootId]!)).toBe(true);
    expect(() => {
      frozen.metadata.title = "nope";
    }).toThrow();
  });

  it("A3: dispatch restores snapshot when command mutates then fails", () => {
    const k = new BuilderKernel(createDefaultDocument({ title: "clean" }));
    const result = k.dispatch(makeHostileMutateThenFail());
    expect(result.success).toBe(false);
    expect(k.getDocument().metadata.title).toBe("clean");
    expect(k.getDocument().tree.nodes.ghost).toBeUndefined();
  });

  it("A3b: dispatch restores snapshot when command throws", () => {
    const k = new BuilderKernel(createDefaultDocument({ title: "clean" }));
    const throwing: ICommand = {
      id: "throw",
      type: "THROW",
      timestamp: 0,
      payload: {},
      execute(document) {
        document.metadata.title = "threw";
        throw new Error("boom");
      },
      undo() {
        return { success: true, mutatedNodeIds: [] };
      },
      serialize() {
        return { id: this.id, type: this.type, timestamp: 0, payload: {} };
      },
    };
    const result = k.dispatch(throwing);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/boom/);
    expect(k.getDocument().metadata.title).toBe("clean");
  });

  it("A4: batch nested-undo failure still fully rolled back by kernel snapshot", () => {
    const k = new BuilderKernel(createDefaultDocument({ title: "clean2" }));
    const batch = new BatchCommand([makeMutateOkBrokenUndo(), makeAlwaysFail()]);
    const result = k.dispatch(batch);
    expect(result.success).toBe(false);
    expect(k.getDocument().metadata.title).toBe("clean2");
    expect(k.getHistory().canUndo()).toBe(false);
  });

  it("A4b: transaction rolls back multi-command failure", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    const before = k.getDocument().metadata.version;
    const result = k.transaction((tx) => {
      tx.dispatch(
        new AddNodeCommand({
          parentId: rootId,
          node: createNodeFromDefaults("Text", "ok", rootId, { id: "ok1", props: { text: "x" } }),
        }),
      );
      tx.dispatch(
        new AddNodeCommand({
          parentId: "missing-parent",
          node: createNodeFromDefaults("Text", "bad", "missing-parent", { id: "bad1" }),
        }),
      );
    });
    expect(result.success).toBe(false);
    expect(k.getDocument().tree.nodes.ok1).toBeUndefined();
    expect(k.getDocument().metadata.version).toBe(before);
  });

  it("A5: plugin cannot overwrite native via nodeRegistry escape hatch", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    expect(() =>
      session.pluginRegistry.register({
        id: "escape",
        name: "escape",
        version: "1.0.0",
        permissions: ["nodes.register"],
        register(kernel) {
          // Attempt former escape hatch — register must not exist on sealed view.
          const reg = kernel.nodeRegistry as unknown as {
            register?: (def: unknown, opts?: { overwrite?: boolean }) => void;
          };
          expect(typeof reg.register).toBe("undefined");
          // And permissioned API still blocks overwrite without nodes.overwrite
          kernel.registerNode({
            type: "Container",
            displayName: "Hijacked",
            category: "Layout",
            icon: "box",
            capabilities: { canvas: true, react: true, html: true },
            constraints: { canHaveChildren: true },
            defaultProps: {},
            defaultLayout: { display: "flex" },
            defaultStyle: {},
            propertyControls: [],
            canvasRendererId: "x",
            codeGeneratorId: "y",
          });
        },
      }),
    ).toThrow(/overwrite|core|native/i);
    expect(session.nodeRegistry.get("Container")?.displayName).toBe("Container");
  });

  it("A6: plugin cannot overwrite core ADD_NODE", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    expect(() =>
      session.pluginRegistry.register({
        id: "cmd-escape",
        name: "cmd-escape",
        version: "1.0.0",
        permissions: ["commands.register", "commands.overwrite"],
        register(kernel) {
          const reg = kernel.commandRegistry as unknown as {
            register?: (...args: unknown[]) => void;
          };
          expect(typeof reg.register).toBe("undefined");
          kernel.registerCommand("ADD_NODE", () => {
            throw new Error("hijacked");
          });
        },
      }),
    ).toThrow(/core command/i);
  });

  it("A7: safeParseBuilderDocument rejects orphan graphs", () => {
    const base = createDefaultDocument();
    const bad = structuredClone(base);
    bad.tree.nodes.orphan = createNodeFromDefaults("Text", "o", "missing", { id: "orphan" });
    const result = safeParseBuilderDocument(bad);
    expect(result.success).toBe(false);
  });

  it("A8: IR compile is deterministic for ids and payloads", () => {
    const ir: UniversalDesignIR = {
      version: IR_SCHEMA_VERSION,
      sourceType: "vision",
      root: {
        id: "n1",
        type: "text",
        name: "T",
        children: [],
        properties: { text: "a" },
        styles: {},
        metadata: {},
      },
    };
    const compiler = new IRToCommandCompiler();
    const a = compiler.compile(ir, "root", 42);
    const b = compiler.compile(ir, "root", 42);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
    expect(a.map((c) => c.timestamp)).toEqual(b.map((c) => c.timestamp));
    expect(JSON.stringify(a.map((c) => c.serialize()))).toBe(
      JSON.stringify(b.map((c) => c.serialize())),
    );
  });

  it("A9: UpdateProperty rejects prototype pollution paths", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;

    for (const path of ["__proto__.polluted", "constructor.prototype.x", "props.__proto__.y"]) {
      const result = k.dispatch(
        new UpdatePropertyCommand({ nodeId: rootId, path, value: true }),
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/forbidden|prototype/i);
    }

    const probe: Record<string, unknown> = {};
    expect(probe.polluted).toBeUndefined();
    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("A10: getHistory does not expose clear/push mutators", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    k.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "t", rootId, { id: "t1", props: { text: "x" } }),
      }),
    );
    const history = k.getHistory();
    expect(history.canUndo()).toBe(true);
    expect((history as unknown as { clear?: unknown }).clear).toBeUndefined();
    expect((history as unknown as { push?: unknown }).push).toBeUndefined();
    expect(history.canUndo()).toBe(true);
  });

  it("replay: serialize→deserialize→execute produces same structural graph", () => {
    const docA = createDefaultDocument({ id: "doc_fixed", title: "T" });
    // Fix root id for stable comparison by reloading through kernel
    const k1 = new BuilderKernel(docA);
    const rootId = k1.getDocument().tree.rootId;
    const cmd = new AddNodeCommand(
      {
        parentId: rootId,
        node: createNodeFromDefaults("Text", "Headline", rootId, {
          id: "headline",
          props: { text: "Hello" },
          metadata: { createdAt: 1, updatedAt: 1, version: 1, sourceImport: "manual" },
        }),
      },
      "cmd_1",
      1,
    );
    expect(k1.dispatch(cmd).success).toBe(true);
    const serialized = JSON.parse(JSON.stringify(cmd.serialize()));

    const k2 = new BuilderKernel(createDefaultDocument({ id: "doc_fixed", title: "T" }));
    // k2 has a different root id — load same document snapshot structure via factory is random.
    // Instead replay on a clone of pre-command document.
    const base = createDefaultDocument({ id: "doc_fixed", title: "T" });
    // Force same root id for deterministic replay harness
    const fixedRoot = "root_fixed";
    const fixedBase: BuilderDocument = {
      ...base,
      tree: {
        rootId: fixedRoot,
        nodes: {
          [fixedRoot]: {
            ...base.tree.nodes[base.tree.rootId]!,
            id: fixedRoot,
            children: [],
            metadata: { createdAt: 0, updatedAt: 0, version: 1 },
          },
        },
      },
      metadata: { ...base.metadata, id: "doc_fixed", createdAt: 0, updatedAt: 0, version: 1 },
    };

    const ka = new BuilderKernel(fixedBase);
    const kb = new BuilderKernel(fixedBase);
    const payload = {
      parentId: fixedRoot,
      node: createNodeFromDefaults("Text", "Headline", fixedRoot, {
        id: "headline",
        props: { text: "Hello" },
        metadata: { createdAt: 1, updatedAt: 1, version: 1, sourceImport: "manual" },
      }),
    };
    const c1 = new AddNodeCommand(payload, "cmd_1", 1);
    const c2 = new AddNodeCommand(
      JSON.parse(JSON.stringify(c1.serialize().payload)),
      "cmd_1",
      1,
    );
    expect(ka.dispatch(c1).success).toBe(true);
    expect(kb.dispatch(c2).success).toBe(true);

    const struct = (d: BuilderDocument) =>
      Object.fromEntries(
        Object.entries(d.tree.nodes).map(([id, n]) => [
          id,
          { id: n.id, type: n.type, parentId: n.parentId, children: n.children, props: n.props },
        ]),
      );
    expect(struct(ka.getDocument())).toEqual(struct(kb.getDocument()));
    expect(serialized.type).toBe("ADD_NODE");
  });
});
