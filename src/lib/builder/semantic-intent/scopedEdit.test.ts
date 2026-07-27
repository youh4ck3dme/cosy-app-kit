import { describe, it, expect } from "vitest";
import type { RawNode } from "./types";
import {
  applyScopedPromptHeuristic,
  runScopedEditPipeline,
} from "./scopedEdit";
import { AISpatialContextEngine } from "./spatialEngine";

describe("Scoped edit pipeline (Canvas Select → Delta)", () => {
  const fullAST: RawNode[] = [
    {
      id: "root",
      type: "box",
      children: [
        { id: "title", type: "text", text: "Welcome", className: "text-lg" },
        {
          id: "cta",
          type: "button",
          text: "Buy Now",
          className: "bg-blue-500 text-white",
          action: "submit",
        },
        { id: "side", type: "text", text: "Unrelated", className: "text-sm" },
      ],
    },
  ];

  it("extract → test editor color edit → applyASTDelta only touches target", async () => {
    const result = await runScopedEditPipeline({
      fullAST,
      targetNodeId: "cta",
      userPrompt: "Zmeň toto tlačidlo na červené",
      source: "test",
      editNode: (scoped, prompt) => applyScopedPromptHeuristic(scoped.targetNode, prompt),
    });

    expect(result).not.toBeNull();
    expect(result!.source).toBe("test");
    expect(result!.scoped.parentPath).toEqual(["root", "cta"]);
    expect(result!.scoped.minimalPromptContext).toContain("Buy Now");
    expect(result!.updatedNode.className).toContain("bg-red-500");
    expect(result!.updatedNode.id).toBe("cta");

    const children = result!.updatedAST[0].children!;
    expect(children.find((c) => c.id === "side")?.text).toBe("Unrelated");
    expect(children.find((c) => c.id === "title")?.text).toBe("Welcome");
    expect(children.find((c) => c.id === "cta")?.className).toContain("bg-red-500");
  });

  it("scoped context is far smaller than full AST JSON", () => {
    const spatial = new AISpatialContextEngine();
    const scoped = spatial.extractScopedContext("cta", fullAST);
    expect(scoped).not.toBeNull();

    const fullSize = JSON.stringify(fullAST).length;
    const scopedSize = scoped!.minimalPromptContext.length;
    expect(scopedSize).toBeLessThan(fullSize);
    // For this tree, scoped payload should be clearly smaller
    expect(scopedSize / fullSize).toBeLessThan(0.9);
  });

  it("injectable editNode supports test stub path", async () => {
    const result = await runScopedEditPipeline({
      fullAST,
      targetNodeId: "title",
      userPrompt: "anything",
      source: "test",
      editNode: async (scoped) => ({
        ...scoped.targetNode,
        text: "Hello from test stub",
        className: "text-2xl font-bold",
      }),
    });

    expect(result?.source).toBe("test");
    expect(result?.updatedNode.text).toBe("Hello from test stub");
    const title = result!.updatedAST[0].children!.find((c) => c.id === "title");
    expect(title?.text).toBe("Hello from test stub");
  });

  it("returns null when selection id is unknown", async () => {
    const result = await runScopedEditPipeline({
      fullAST,
      targetNodeId: "missing",
      userPrompt: "make red",
      source: "test",
      editNode: (scoped, prompt) => applyScopedPromptHeuristic(scoped.targetNode, prompt),
    });
    expect(result).toBeNull();
  });

  it("test helper renames button text", () => {
    const node: RawNode = { id: "b1", type: "button", text: "Old", className: "bg-blue-500" };
    const next = applyScopedPromptHeuristic(node, 'change text to "Purchase"');
    expect(next.text).toBe("Purchase");
  });

  it("full cycle: delta AST can be re-extracted after edit", async () => {
    const edit = (scoped: { targetNode: RawNode }, prompt: string) =>
      applyScopedPromptHeuristic(scoped.targetNode, prompt);

    const first = await runScopedEditPipeline({
      fullAST,
      targetNodeId: "cta",
      userPrompt: "make it green",
      source: "test",
      editNode: edit,
    });
    expect(first).not.toBeNull();

    const second = await runScopedEditPipeline({
      fullAST: first!.updatedAST,
      targetNodeId: "cta",
      userPrompt: "make it purple",
      source: "test",
      editNode: edit,
    });
    expect(second!.updatedNode.className).toContain("bg-purple-500");
    expect(second!.updatedNode.className).not.toContain("bg-emerald-500");
  });
});
