import type { FigmaNode, RawNode, NodeType } from "./types";
import { ASTAutoHealer } from "./types";

const VECTOR_TYPES = new Set([
  "VECTOR",
  "STAR",
  "ELLIPSE",
  "LINE",
  "REGULAR_POLYGON",
  "BOOLEAN_OPERATION",
]);

type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Converts Figma REST nodes into builder RawNode AST with:
 * - absolute layout positioning (parent-relative)
 * - vector / shape fallbacks
 * - auto-layout flex mapping
 */
export class FigmaAdapterEngine {
  private maxRetries = 3;
  private baseDelayMs = 1000;

  public convertFigmaNode(node: FigmaNode, parentBounds?: Bounds): RawNode {
    if (!node) {
      return { id: "null_fallback", type: "box", className: "hidden" };
    }

    const nameLower = (node.name || "").toLowerCase();
    const classNames: string[] = [];
    const isAbsolute = node.layoutPositioning === "ABSOLUTE" || node.isAbsolute === true;

    // 1. ABSOLUTE POSITIONING — coordinates relative to parent frame
    if (isAbsolute) {
      classNames.push("absolute");
      if (node.absoluteBoundingBox) {
        const left = Math.round(
          node.absoluteBoundingBox.x - (parentBounds?.x ?? node.absoluteBoundingBox.x),
        );
        const top = Math.round(
          node.absoluteBoundingBox.y - (parentBounds?.y ?? node.absoluteBoundingBox.y),
        );
        classNames.push(`left-[${left}px]`);
        classNames.push(`top-[${top}px]`);
        if (node.absoluteBoundingBox.width > 0) {
          classNames.push(`w-[${Math.round(node.absoluteBoundingBox.width)}px]`);
        }
        if (node.absoluteBoundingBox.height > 0) {
          classNames.push(`h-[${Math.round(node.absoluteBoundingBox.height)}px]`);
        }
      }
    }

    // 2. VECTOR / SHAPE FALLBACK
    if (VECTOR_TYPES.has(node.type)) {
      const box = node.absoluteBoundingBox;
      const vectorNode: RawNode = {
        id: node.id || `vector_${Math.random().toString(36).substring(2, 7)}`,
        type: "box",
        className: `inline-block ${classNames.join(" ")}`.trim(),
        meta: {
          isVectorPlaceholder: true,
          figmaType: node.type,
          figmaName: node.name || null,
          svgWidth: box ? Math.round(box.width) : null,
          svgHeight: box ? Math.round(box.height) : null,
        },
      };
      return ASTAutoHealer.sanitizeAndHeal([vectorNode])[0];
    }

    // Parent needs relative positioning when it contains absolute children
    const hasAbsoluteChildren = node.children?.some(
      (child) => child.layoutPositioning === "ABSOLUTE" || child.isAbsolute === true,
    );
    if (hasAbsoluteChildren && !classNames.includes("absolute")) {
      classNames.push("relative");
    }

    let type: NodeType = "box";
    let inputType: RawNode["inputType"];
    let action: RawNode["action"];

    if (node.type === "TEXT") {
      type = "text";
    } else if (nameLower.includes("button") || nameLower.includes("btn")) {
      type = "button";
      action = nameLower.includes("submit")
        ? "submit"
        : nameLower.includes("cancel")
          ? "cancel"
          : "navigate";
    } else if (nameLower.includes("input") || nameLower.includes("field")) {
      type = "input";
      inputType = nameLower.includes("email")
        ? "email"
        : nameLower.includes("pass")
          ? "password"
          : "text";
    } else if (nameLower.includes("list") || nameLower.includes("grid")) {
      type = "list";
    }

    // Flex AutoLayout & Spacing
    if (node.layoutMode === "HORIZONTAL") {
      classNames.push("flex flex-row items-center");
    } else if (node.layoutMode === "VERTICAL") {
      classNames.push("flex flex-col");
    }

    if (node.itemSpacing != null) {
      if (node.itemSpacing <= 8) classNames.push("gap-2");
      else if (node.itemSpacing <= 16) classNames.push("gap-4");
      else classNames.push("gap-8");
    }

    if (node.cornerRadius != null) {
      if (node.cornerRadius <= 4) classNames.push("rounded-sm");
      else if (node.cornerRadius <= 8) classNames.push("rounded-md");
      else if (node.cornerRadius <= 16) classNames.push("rounded-xl");
      else classNames.push("rounded-full");
    }

    if (node.fills && Array.isArray(node.fills)) {
      const activeFill = node.fills.find((f) => f.visible !== false);
      if (activeFill && activeFill.type === "SOLID" && activeFill.color) {
        const { r, g, b } = activeFill.color;
        if (r < 0.2 && g < 0.2 && b < 0.2) classNames.push("bg-gray-900 text-white");
        else if (r > 0.8 && g > 0.8 && b > 0.8) classNames.push("bg-white text-gray-900");
        else classNames.push("bg-indigo-600 text-white");
      }
    }

    const selfBounds = node.absoluteBoundingBox;
    const children = Array.isArray(node.children)
      ? node.children.map((child) => this.convertFigmaNode(child, selfBounds))
      : undefined;

    const rawNode: RawNode = {
      id: node.id || `figma_${Math.random().toString(36).substring(2, 7)}`,
      type,
      text: node.characters,
      inputType,
      action,
      className: classNames.filter(Boolean).join(" ").trim(),
      children,
      meta: { figmaName: node.name || null },
    };

    return ASTAutoHealer.sanitizeAndHeal([rawNode])[0];
  }

  /**
   * Fetch Figma file JSON with exponential backoff on 429, then convert document root.
   */
  public async fetchAndParse(fileKey: string, personalAccessToken: string): Promise<RawNode> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
          headers: { "X-Figma-Token": personalAccessToken },
        });

        if (res.status === 429) {
          attempt++;
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!res.ok) {
          throw new Error(`Figma API error ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as {
          document?: FigmaNode;
        };
        if (!data.document) {
          throw new Error("Figma response missing document root");
        }
        return this.convertFigmaNode(data.document);
      } catch (error) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw error;
        }
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error("Figma fetchAndParse exhausted retries");
  }
}
