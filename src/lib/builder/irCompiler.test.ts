import { describe, expect, it } from "vitest";

import { IR_SCHEMA_VERSION, type UniversalDesignIR } from "@/lib/builder/imports/ir/ir.types";
import { IRToCommandCompiler } from "@/lib/builder/imports/ir/irToCommandCompiler";
import { createDefaultDocument } from "@/lib/builder/document/documentFactory";
import { BuilderKernel } from "@/lib/builder/kernel/builderKernel";
import { walkNodeIds } from "@/lib/builder/nodes/nodeGraph";

describe("irCompiler", () => {
  it("compiles a 3-level UniversalDesignIR into AddNodeCommand batch order", () => {
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
            properties: { text: "Build faster" },
            styles: { fontSize: "32px" },
            metadata: { confidence: 0.91 },
          },
          {
            id: "cta-wrap",
            type: "container",
            name: "CTA Wrap",
            children: [
              {
                id: "cta",
                type: "button",
                name: "CTA",
                children: [],
                properties: { label: "Get started" },
                styles: {},
                metadata: { confidence: 0.88 },
              },
            ],
            properties: {},
            styles: { flexDirection: "row" },
            metadata: {},
          },
        ],
        properties: {},
        styles: { flexDirection: "column", padding: "24px" },
        metadata: { confidence: 0.94 },
      },
    };

    const compiler = new IRToCommandCompiler();
    const doc = createDefaultDocument();
    const commands = compiler.compile(ir, doc.tree.rootId);

    expect(commands.map((c) => c.type)).toEqual(["ADD_NODE", "ADD_NODE", "ADD_NODE", "ADD_NODE"]);
    expect(commands.map((c) => (c.payload as { node: { id: string } }).node.id)).toEqual([
      "hero",
      "title",
      "cta-wrap",
      "cta",
    ]);

    const kernel = new BuilderKernel(doc);
    for (const command of commands) {
      const result = kernel.dispatch(command);
      expect(result.success).toBe(true);
    }

    const tree = kernel.getDocument().tree;
    expect(tree.nodes.hero?.parentId).toBe(doc.tree.rootId);
    expect(tree.nodes.title?.parentId).toBe("hero");
    expect(tree.nodes["cta-wrap"]?.parentId).toBe("hero");
    expect(tree.nodes.cta?.parentId).toBe("cta-wrap");
    expect(tree.nodes.title?.props.text).toBe("Build faster");
    expect(tree.nodes.cta?.props.label).toBe("Get started");
    expect(tree.nodes.hero?.metadata.sourceImport).toBe("vision");

    const order = walkNodeIds(kernel.getDocument(), "hero");
    expect(order).toEqual(["hero", "title", "cta-wrap", "cta"]);
  });

  it("rejects unsupported IR versions", () => {
    const compiler = new IRToCommandCompiler();
    expect(() =>
      compiler.compile(
        {
          version: "0.0.1",
          sourceType: "prompt",
          root: {
            id: "a",
            type: "container",
            name: "A",
            children: [],
            properties: {},
            styles: {},
            metadata: {},
          },
        },
        "parent",
      ),
    ).toThrow(/IR version/);
  });
});
