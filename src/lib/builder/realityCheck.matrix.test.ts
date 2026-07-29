import { describe, expect, it } from "vitest";

import { AddNodeCommand } from "@/lib/builder/commands/impl/addNode.command";
import { RemoveNodeCommand } from "@/lib/builder/commands/impl/removeNode.command";
import { UpdatePropertyCommand } from "@/lib/builder/commands/impl/updateProperty.command";
import { BatchCommand } from "@/lib/builder/commands/impl/batch.command";
import { globalCommandRegistry } from "@/lib/builder/commands/commandManager";
import {
  createDefaultDocument,
  createNodeFromDefaults,
} from "@/lib/builder/document/documentFactory";
import { BuilderKernel } from "@/lib/builder/kernel/builderKernel";
import { bootstrapBuilderKernel } from "@/lib/builder/kernel/kernelFacade";
import { IR_SCHEMA_VERSION, type UniversalDesignIR } from "@/lib/builder/imports/ir/ir.types";
import { IRToCommandCompiler } from "@/lib/builder/imports/ir/irToCommandCompiler";
import { walkNodeIds } from "@/lib/builder/nodes/nodeGraph";
import { NodeRegistry } from "@/lib/builder/registry/nodeRegistry";
import { containerDefinition } from "@/lib/builder/registry/definitions/native";
import type { BuilderDocument } from "@/lib/builder/document/document.types";

function structuralGraph(doc: BuilderDocument, rootWalkFrom?: string) {
  const nodes = Object.fromEntries(
    Object.entries(doc.tree.nodes).map(([id, n]) => [
      id,
      {
        id: n.id,
        type: n.type,
        parentId: n.parentId,
        children: [...n.children],
        props: n.props,
      },
    ]),
  );
  return {
    rootId: doc.tree.rootId,
    walk: walkNodeIds(doc, rootWalkFrom ?? doc.tree.rootId),
    nodes,
  };
}

describe("Kernel Trust Score — reality check matrix", () => {
  it("C1: getDocument() is sealed against external mutation", () => {
    const k = new BuilderKernel(createDefaultDocument({ title: "Safe" }));
    const rootId = k.getDocument().tree.rootId;
    const snap = k.getDocument();
    snap.metadata.title = "HACKED_EXTERNALLY";
    snap.tree.nodes[rootId]!.children = ["ghost"];
    expect(k.getDocument().metadata.title).toBe("Safe");
    expect(k.getDocument().tree.nodes[rootId]!.children).not.toContain("ghost");
  });

  it("ALIAS: ADD_NODE deep-clones props", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "t", rootId, {
      id: "alias",
      props: { text: "1" },
    });
    expect(k.dispatch(new AddNodeCommand({ parentId: rootId, node })).success).toBe(true);
    node.props.text = "2";
    expect(k.getDocument().tree.nodes.alias?.props.text).toBe("1");
  });

  it("C2: ADD_NODE.undo refuses when children exist", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    const addSec = new AddNodeCommand({
      parentId: rootId,
      node: createNodeFromDefaults("Section", "S", rootId, { id: "sec2" }),
    });
    expect(addSec.execute(doc).success).toBe(true);
    expect(
      new AddNodeCommand({
        parentId: "sec2",
        node: createNodeFromDefaults("Button", "B", "sec2", { id: "btn2" }),
      }).execute(doc).success,
    ).toBe(true);
    const undo = addSec.undo(doc);
    expect(undo.success).toBe(false);
    expect(doc.tree.nodes.btn2).toBeDefined();
    expect(doc.tree.nodes.sec2).toBeDefined();
  });

  it("GRAPH_SESSION: delete container undo/redo restores structural graph", () => {
    const k = new BuilderKernel(createDefaultDocument());
    const rootId = k.getDocument().tree.rootId;
    k.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Section", "section", rootId, { id: "section" }),
      }),
    );
    k.dispatch(
      new AddNodeCommand({
        parentId: "section",
        node: createNodeFromDefaults("Container", "container", "section", { id: "container" }),
      }),
    );
    k.dispatch(
      new AddNodeCommand({
        parentId: "container",
        node: createNodeFromDefaults("Button", "button", "container", {
          id: "button",
          props: { label: "X" },
        }),
      }),
    );
    const before = structuralGraph(k.getDocument());
    k.dispatch(new RemoveNodeCommand({ nodeId: "container" }));
    k.undo();
    k.redo();
    k.undo();
    expect(structuralGraph(k.getDocument())).toEqual(before);
  });

  it("C3_REMOVE: serialize→deserialize→undo restores subtree", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    new AddNodeCommand({
      parentId: rootId,
      node: createNodeFromDefaults("Section", "section", rootId, { id: "section" }),
    }).execute(doc);
    new AddNodeCommand({
      parentId: "section",
      node: createNodeFromDefaults("Container", "container", "section", { id: "container" }),
    }).execute(doc);
    new AddNodeCommand({
      parentId: "container",
      node: createNodeFromDefaults("Button", "button", "container", {
        id: "button",
        props: { label: "X" },
      }),
    }).execute(doc);

    const rem = new RemoveNodeCommand({ nodeId: "container" });
    expect(rem.execute(doc).success).toBe(true);
    const json = JSON.parse(JSON.stringify(rem.serialize()));
    const reconstructed = globalCommandRegistry.create(json);
    const undo = reconstructed.undo(doc);
    expect(undo.success).toBe(true);
    expect(doc.tree.nodes.container).toBeDefined();
    expect(doc.tree.nodes.button).toBeDefined();
  });

  it("C3_UPDATE: cold JSON undo restores previous value without re-execute", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    new AddNodeCommand({
      parentId: rootId,
      node: createNodeFromDefaults("Text", "t", rootId, { id: "t1", props: { text: "A" } }),
    }).execute(doc);
    const upd = new UpdatePropertyCommand({
      nodeId: "t1",
      path: "props.text",
      value: "B",
    });
    expect(upd.execute(doc).success).toBe(true);
    expect(doc.tree.nodes.t1?.props.text).toBe("B");
    const json = JSON.parse(JSON.stringify(upd.serialize()));
    const cold = globalCommandRegistry.create(json);
    expect(cold.undo(doc).success).toBe(true);
    expect(doc.tree.nodes.t1?.props.text).toBe("A");
  });

  it("C4: loadDocument rejects orphan/dangling graph", () => {
    const base = createDefaultDocument();
    const rootId = base.tree.rootId;
    const bad = structuredClone(base);
    bad.tree.nodes.orphan = createNodeFromDefaults("Text", "orphan", "missing-parent", {
      id: "orphan",
      props: { text: "x" },
    });
    bad.tree.nodes[rootId]!.children.push("dangling");
    const k = new BuilderKernel();
    expect(() => k.loadDocument(bad)).toThrow(/integrity|ORPHAN|DANGLING|INVALID/i);
  });

  it("H1: kernel.transaction API exists and rolls back on failure", () => {
    const k = new BuilderKernel(createDefaultDocument());
    expect(typeof k.transaction).toBe("function");
    const rootId = k.getDocument().tree.rootId;
    const before = structuralGraph(k.getDocument());
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
    expect(structuralGraph(k.getDocument())).toEqual(before);
    expect(k.getHistory().canUndo()).toBe(false);
  });

  it("H2: BATCH registered and round-trips", () => {
    expect(globalCommandRegistry.has("BATCH")).toBe(true);
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    const batch = new BatchCommand([
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "a", rootId, { id: "a1", props: { text: "1" } }),
      }),
    ]);
    expect(batch.execute(doc).success).toBe(true);
    const json = JSON.parse(JSON.stringify(batch.serialize()));
    const cold = globalCommandRegistry.create(json);
    expect(cold.type).toBe("BATCH");
    expect(cold.undo(doc).success).toBe(true);
    expect(doc.tree.nodes.a1).toBeUndefined();
  });

  it("H3: plugin cannot overwrite native Container by default", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    expect(() =>
      session.pluginRegistry.register({
        id: "evil",
        name: "evil",
        version: "1.0.0",
        nodes: [
          {
            ...containerDefinition,
            type: "Container",
            displayName: "Hijacked",
            generateCode: () => "<script>x</script>",
          },
        ],
        register() {},
      }),
    ).toThrow(/overwrite|already registered/i);
    expect(session.nodeRegistry.get("Container")?.displayName).toBe("Container");
  });

  it("IR_DET: same Vision IR → identical comparable tree", () => {
    const ir: UniversalDesignIR = {
      version: IR_SCHEMA_VERSION,
      sourceType: "vision",
      root: {
        id: "hero",
        type: "container",
        name: "Hero",
        children: [
          {
            id: "title",
            type: "text",
            name: "Title",
            children: [],
            properties: { text: "Build" },
            styles: {},
            metadata: { confidence: 0.9 },
          },
          {
            id: "cta",
            type: "button",
            name: "CTA",
            children: [],
            properties: { label: "Go" },
            styles: {},
            metadata: {},
          },
        ],
        properties: {},
        styles: { flexDirection: "column" },
        metadata: {},
      },
    };

    const compiler = new IRToCommandCompiler();
    const build = () => {
      const k = new BuilderKernel(createDefaultDocument({ id: "doc_fixed", title: "T" }));
      const rid = k.getDocument().tree.rootId;
      expect(k.transaction(compiler.compile(ir, rid, 0)).success).toBe(true);
      const doc = k.getDocument();
      return Object.fromEntries(
        Object.entries(doc.tree.nodes)
          .filter(([id]) => id !== rid)
          .map(([id, n]) => [
            id,
            {
              id: n.id,
              type: n.type,
              parentId: n.parentId === rid ? "__ROOT__" : n.parentId,
              children: n.children,
              props: n.props,
              layout: n.layout,
              style: n.style,
              sourceImport: n.metadata.sourceImport,
              metaVersion: n.metadata.version,
              createdAt: n.metadata.createdAt,
            },
          ]),
      );
    };

    expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
  });
});
