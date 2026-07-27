import { describe, it, expect } from "vitest";
import { AISpatialContextEngine } from "./spatialEngine";
import type { RawNode } from "./types";

describe("Unit: AISpatialContextEngine", () => {
  const spatialEngine = new AISpatialContextEngine();

  it("1. extracts the exact node and builds minimal LLM context", () => {
    const complexAST: RawNode[] = [
      {
        id: "root_header",
        type: "box",
        children: [
          { id: "nav_list", type: "list" },
          { id: "target_btn", type: "button", text: "Buy Now", className: "bg-blue-500" },
        ],
      },
    ];

    const result = spatialEngine.extractScopedContext("target_btn", complexAST);

    expect(result).toBeDefined();
    expect(result?.targetNode.id).toBe("target_btn");
    expect(result?.parentPath).toEqual(["root_header", "target_btn"]);
    expect(result?.minimalPromptContext).toContain("Buy Now");
  });

  it("2. Auto-Fixer: converts rigid Figma width + flex-row to responsive Tailwind", () => {
    const rigidFigmaAST: RawNode[] = [
      {
        id: "figma_container",
        type: "box",
        className: "w-[1200px] flex-row bg-white",
      },
    ];

    const responsiveAST = spatialEngine.autoFixMobileResponsive(rigidFigmaAST);

    expect(responsiveAST[0].className).toContain("w-full");
    expect(responsiveAST[0].className).toContain("max-w-6xl");
    expect(responsiveAST[0].className).toContain("flex-col");
    expect(responsiveAST[0].className).toContain("md:flex-row");
    expect(responsiveAST[0].className).toContain("flex-wrap");
  });

  it("3. returns null when target id is missing", () => {
    const ast: RawNode[] = [{ id: "only", type: "box" }];
    expect(spatialEngine.extractScopedContext("missing", ast)).toBeNull();
  });

  it("4. applyASTDelta replaces only the matching deep node", () => {
    const fullAST: RawNode[] = [
      {
        id: "root",
        type: "box",
        children: [
          { id: "sibling", type: "text", text: "Keep me" },
          { id: "target", type: "button", text: "Old", className: "bg-blue-500" },
        ],
      },
    ];

    const updated: RawNode = {
      id: "target",
      type: "button",
      text: "New",
      className: "bg-navy-900",
    };

    const next = spatialEngine.applyASTDelta(fullAST, updated);
    const children = next[0].children!;

    expect(children.find((c) => c.id === "sibling")?.text).toBe("Keep me");
    expect(children.find((c) => c.id === "target")?.text).toBe("New");
    expect(children.find((c) => c.id === "target")?.className).toBe("bg-navy-900");
  });

  it("5. auto-fix recurses into nested children", () => {
    const nested: RawNode[] = [
      {
        id: "outer",
        type: "box",
        className: "p-4",
        children: [
          {
            id: "inner",
            type: "box",
            className: "w-[1440px] flex-row",
          },
        ],
      },
    ];

    const fixed = spatialEngine.autoFixMobileResponsive(nested);
    const inner = fixed[0].children![0];

    expect(inner.className).toContain("w-full");
    expect(inner.className).toContain("max-w-6xl");
    expect(inner.className).toContain("md:flex-row");
  });

  it("6. auto-fix is idempotent on already-fixed classes", () => {
    const rigid: RawNode[] = [
      {
        id: "figma_container",
        type: "box",
        className: "w-[1200px] flex-row bg-white",
      },
    ];

    const once = spatialEngine.autoFixMobileResponsive(rigid);
    const twice = spatialEngine.autoFixMobileResponsive(once);

    expect(twice[0].className).toBe(once[0].className);
  });

  it("7. adds break-words to text nodes without overflow protection", () => {
    const nodes: RawNode[] = [
      { id: "t1", type: "text", text: "Long copy", className: "text-sm" },
    ];

    const fixed = spatialEngine.autoFixMobileResponsive(nodes);
    expect(fixed[0].className).toContain("break-words");
    expect(fixed[0].className).toContain("overflow-hidden");
  });

  it("8. preserves existing max-w when stripping rigid width", () => {
    const nodes: RawNode[] = [
      {
        id: "c1",
        type: "box",
        className: "w-[900px] max-w-3xl",
      },
    ];

    const fixed = spatialEngine.autoFixMobileResponsive(nodes);
    expect(fixed[0].className).toContain("w-full");
    expect(fixed[0].className).toContain("max-w-3xl");
    expect(fixed[0].className).not.toMatch(/w-\[\d+px\]/);
  });
});
