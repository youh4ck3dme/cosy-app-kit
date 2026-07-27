import { describe, it, expect } from "vitest";
import { FigmaAdapterEngine } from "./FigmaAdapterEngine";
import type { FigmaNode } from "./types";

describe("FigmaAdapterEngine hardening", () => {
  const engine = new FigmaAdapterEngine();

  it("maps absolute children with parent-relative left/top and parent relative class", () => {
    const parent: FigmaNode = {
      id: "frame",
      name: "Card",
      type: "FRAME",
      layoutMode: "NONE",
      absoluteBoundingBox: { x: 100, y: 200, width: 400, height: 300 },
      children: [
        {
          id: "badge",
          name: "Badge",
          type: "FRAME",
          layoutPositioning: "ABSOLUTE",
          absoluteBoundingBox: { x: 120, y: 230, width: 40, height: 20 },
        },
      ],
    };

    const result = engine.convertFigmaNode(parent);
    expect(result.className).toContain("relative");
    const child = result.children?.[0];
    expect(child).toBeDefined();
    expect(child!.className).toContain("absolute");
    expect(child!.className).toContain("left-[20px]");
    expect(child!.className).toContain("top-[30px]");
  });

  it("converts VECTOR / STAR / ELLIPSE / BOOLEAN_OPERATION to box placeholders", () => {
    for (const type of ["VECTOR", "STAR", "ELLIPSE", "BOOLEAN_OPERATION"] as const) {
      const node: FigmaNode = {
        id: `v-${type}`,
        name: type,
        type,
        absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
      };
      const result = engine.convertFigmaNode(node);
      expect(result.type).toBe("box");
      expect(result.meta?.isVectorPlaceholder).toBe(true);
      expect(result.meta?.figmaType).toBe(type);
      expect(result.meta?.svgWidth).toBe(24);
      expect(result.meta?.svgHeight).toBe(24);
    }
  });

  it("maps horizontal auto-layout to flex-row", () => {
    const node: FigmaNode = {
      id: "row",
      name: "Row",
      type: "FRAME",
      layoutMode: "HORIZONTAL",
      itemSpacing: 12,
    };
    const result = engine.convertFigmaNode(node);
    expect(result.className).toContain("flex");
    expect(result.className).toContain("flex-row");
    expect(result.className).toContain("gap-4");
  });

  it("detects button/input by name heuristics", () => {
    const btn = engine.convertFigmaNode({
      id: "1",
      name: "Primary Button Submit",
      type: "FRAME",
    });
    expect(btn.type).toBe("button");
    expect(btn.action).toBe("submit");

    const input = engine.convertFigmaNode({
      id: "2",
      name: "Email Input Field",
      type: "FRAME",
    });
    expect(input.type).toBe("input");
    expect(input.inputType).toBe("email");
  });

  it("returns hidden fallback for null-like empty node", () => {
    // @ts-expect-error intentional null guard test
    const result = engine.convertFigmaNode(null);
    expect(result.id).toBe("null_fallback");
    expect(result.className).toContain("hidden");
  });
});
