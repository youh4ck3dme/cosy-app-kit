import { describe, it, expect } from "vitest";
import {
  IPHONE_17_AIR,
  overflowsIPhone17AirWidth,
  extractArbitraryPxWidths,
  hasRigidWidthOverflowForIPhone17Air,
  iPhone17AirSafeContentHeight,
  iPhone17AirSafeAreaCssVars,
} from "./iphone17Air";
import { AISpatialContextEngine } from "../semantic-intent/spatialEngine";
import { FigmaAdapterEngine } from "../semantic-intent/FigmaAdapterEngine";
import { SemanticIntentEngine } from "../semantic-intent";
import type { RawNode, FigmaNode } from "../semantic-intent/types";
import { CRDTMultiplayerEngine } from "../multiplayer/crdtEngine";

/**
 * Special QA suite: iPhone 17 Air (420×912 @3x).
 * Guards mobile canvas, spatial auto-fix, Figma absolute layouts, and CRDT AST.
 */
describe("iPhone 17 Air — device profile", () => {
  it("matches published CSS viewport 420×912 @3x", () => {
    expect(IPHONE_17_AIR.viewport.width).toBe(420);
    expect(IPHONE_17_AIR.viewport.height).toBe(912);
    expect(IPHONE_17_AIR.devicePixelRatio).toBe(3);
    expect(IPHONE_17_AIR.physical.width).toBe(1260);
    expect(IPHONE_17_AIR.physical.height).toBe(2736);
    expect(IPHONE_17_AIR.physical.width).toBe(
      IPHONE_17_AIR.viewport.width * IPHONE_17_AIR.devicePixelRatio,
    );
    expect(IPHONE_17_AIR.physical.height).toBe(
      IPHONE_17_AIR.viewport.height * IPHONE_17_AIR.devicePixelRatio,
    );
  });

  it("safe content height accounts for Dynamic Island + home indicator", () => {
    // 912 - 68 - 34 = 810
    expect(iPhone17AirSafeContentHeight()).toBe(810);
    expect(iPhone17AirSafeContentHeight()).toBeLessThan(IPHONE_17_AIR.viewport.height);
  });

  it("safe-area CSS vars match portrait insets", () => {
    const css = iPhone17AirSafeAreaCssVars();
    expect(css).toContain("--sat: 68px");
    expect(css).toContain("--sab: 34px");
  });

  it("detects Figma desktop widths that overflow 420px", () => {
    expect(overflowsIPhone17AirWidth(420)).toBe(false);
    expect(overflowsIPhone17AirWidth(421)).toBe(true);
    expect(overflowsIPhone17AirWidth(1440)).toBe(true);
    expect(hasRigidWidthOverflowForIPhone17Air("w-[1440px] flex-row bg-white")).toBe(true);
    expect(hasRigidWidthOverflowForIPhone17Air("w-full max-w-6xl")).toBe(false);
    expect(hasRigidWidthOverflowForIPhone17Air("md:w-[1200px] w-full")).toBe(false);
    expect(extractArbitraryPxWidths("w-[900px] max-w-[400px]")).toEqual([900, 400]);
  });
});

describe("iPhone 17 Air — Spatial auto-fix (layout collapse guard)", () => {
  const spatial = new AISpatialContextEngine();

  it("rewrites Figma 1440px shell so it no longer overflows 420 CSS px", () => {
    const figmaShell: RawNode[] = [
      {
        id: "desktop-shell",
        type: "box",
        className: "w-[1440px] flex-row bg-white",
        children: [
          { id: "hero", type: "text", text: "Launch", className: "text-3xl" },
          {
            id: "cta",
            type: "button",
            text: "Buy",
            className: "w-[480px] bg-blue-600",
          },
        ],
      },
    ];

    expect(hasRigidWidthOverflowForIPhone17Air(figmaShell[0].className!)).toBe(true);

    const fixed = spatial.autoFixMobileResponsive(figmaShell);
    const root = fixed[0];

    expect(hasRigidWidthOverflowForIPhone17Air(root.className || "")).toBe(false);
    expect(root.className).toContain("w-full");
    expect(root.className).toContain("max-w-6xl");
    // Horizontal strip becomes mobile column stack
    expect(root.className).toContain("flex-col");
    expect(root.className).toContain("md:flex-row");

    const cta = root.children?.find((c) => c.id === "cta");
    expect(cta).toBeDefined();
    expect(hasRigidWidthOverflowForIPhone17Air(cta!.className || "")).toBe(false);
  });

  it("keeps text readable with overflow protection on narrow 420px columns", () => {
    const nodes: RawNode[] = [
      {
        id: "copy",
        type: "text",
        text: "Very long marketing copy that must wrap on iPhone 17 Air without horizontal scroll.",
        className: "text-base",
      },
    ];
    const fixed = spatial.autoFixMobileResponsive(nodes);
    expect(fixed[0].className).toContain("break-words");
    expect(fixed[0].className).toContain("overflow-hidden");
  });

  it("emitted form code stays usable after auto-fix at 420px intent", () => {
    const engine = new SemanticIntentEngine();
    const rigid: RawNode[] = [
      {
        id: "login",
        type: "box",
        className: "w-[900px] flex-row",
        children: [
          {
            id: "email",
            type: "input",
            inputType: "email",
            name: "email",
            label: "Email",
          },
          {
            id: "submit",
            type: "button",
            action: "submit",
            text: "Continue",
            className: "w-[500px]",
          },
        ],
      },
    ];

    const result = engine.generateCode("IPhone17AirLogin", rigid);
    expect(result.intent).toBe("FormIntent");
    // No bare desktop-only fixed shell left in class strings of concern
    expect(result.code).not.toMatch(/\bw-\[9\d{2,}px\]/);
    expect(result.code).toContain("data-node-id");
    expect(result.code).toContain("Continue");
  });
});

describe("iPhone 17 Air — Figma absolute + vector on narrow frame", () => {
  const figma = new FigmaAdapterEngine();

  it("absolute badge stays parent-relative (not document-absolute 1000px offsets)", () => {
    const frame: FigmaNode = {
      id: "card",
      name: "Card",
      type: "FRAME",
      absoluteBoundingBox: { x: 800, y: 400, width: 360, height: 200 },
      children: [
        {
          id: "badge",
          name: "Sale Badge",
          type: "FRAME",
          layoutPositioning: "ABSOLUTE",
          absoluteBoundingBox: { x: 820, y: 420, width: 64, height: 24 },
        },
      ],
    };

    const ast = figma.convertFigmaNode(frame);
    expect(ast.className).toContain("relative");
    const badge = ast.children?.[0];
    expect(badge?.className).toContain("absolute");
    // 820-800=20, 420-400=20 — fits easily in 420px viewport
    expect(badge?.className).toContain("left-[20px]");
    expect(badge?.className).toContain("top-[20px]");
    expect(badge?.className).not.toContain("left-[820px]");
  });

  it("vector icons become placeholders with dimensions that fit the frame", () => {
    const icon: FigmaNode = {
      id: "star",
      name: "Star",
      type: "STAR",
      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
    };
    const node = figma.convertFigmaNode(icon);
    expect(node.meta?.isVectorPlaceholder).toBe(true);
    expect(Number(node.meta?.svgWidth)).toBeLessThanOrEqual(IPHONE_17_AIR.viewport.width);
  });
});

describe("iPhone 17 Air — Canvas / multiplayer contracts", () => {
  it("frame label and aspect match Live Canvas mobile chrome contract", () => {
    expect(IPHONE_17_AIR.frameLabel).toBe("420 × 912");
    expect(IPHONE_17_AIR.aspectRatio).toBeCloseTo(420 / 912, 5);
    // Taller than wide (portrait phone)
    expect(IPHONE_17_AIR.viewport.height).toBeGreaterThan(IPHONE_17_AIR.viewport.width);
  });

  it("CRDT AST patch preserves nodes when mobile auto-fix only changes classes", () => {
    const crdt = new CRDTMultiplayerEngine();
    const spatial = new AISpatialContextEngine();

    const before: RawNode[] = [
      {
        id: "shell",
        type: "box",
        className: "w-[1200px] flex-row",
        children: [{ id: "t", type: "text", text: "Hi", className: "text-sm" }],
      },
    ];
    crdt.updateAST(before);

    const after = spatial.autoFixMobileResponsive(before);
    crdt.updateAST(after);

    const nodes = crdt.getNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("shell");
    expect(nodes[0].children?.[0]?.id).toBe("t");
    expect(hasRigidWidthOverflowForIPhone17Air(nodes[0].className || "")).toBe(false);
  });

  it("safe area content height is enough for a typical form stack", () => {
    // Rough UI budget: title + 3 fields + button ≈ 6×56px rows
    const minFormBudget = 6 * 56;
    expect(iPhone17AirSafeContentHeight()).toBeGreaterThan(minFormBudget);
  });
});
