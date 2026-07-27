import { type RawNode, ASTAutoHealer } from "./types";

export interface ScopedContextResult {
  targetNode: RawNode;
  parentPath: string[];
  minimalPromptContext: string;
}

/**
 * Spatial AI Context Inspector & Mobile Auto-Fixer.
 * - Scoped AST extract for token-efficient LLM edits
 * - Responsive Tailwind auto-fix for fixed Figma/vision widths
 * - Delta re-application into the full tree
 */
export class AISpatialContextEngine {
  /**
   * Extracts a precise sub-tree context for AI (saves LLM tokens).
   */
  public extractScopedContext(
    targetNodeId: string,
    fullAST: RawNode[],
  ): ScopedContextResult | null {
    let foundNode: RawNode | null = null;
    const path: string[] = [];

    const search = (nodes: RawNode[], currentPath: string[]): boolean => {
      for (const node of nodes) {
        if (node.id === targetNodeId) {
          foundNode = node;
          path.push(...currentPath, node.id);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (search(node.children, [...currentPath, node.id])) {
            return true;
          }
        }
      }
      return false;
    };

    search(fullAST, []);

    if (!foundNode) {
      console.warn(`[SpatialEngine] Node with ID ${targetNodeId} was not found in AST.`);
      return null;
    }

    const target = foundNode as RawNode;
    const minimalPromptContext = JSON.stringify({
      target: {
        id: target.id,
        type: target.type,
        text: target.text,
        label: target.label,
        currentClasses: target.className,
      },
      ancestorPath: path.join(" > "),
    });

    return {
      targetNode: target,
      parentPath: path,
      minimalPromptContext,
    };
  }

  /**
   * Transforms fixed Figma/vision px widths and rigid flex rows into responsive Tailwind.
   */
  public autoFixMobileResponsive(nodes: RawNode[]): RawNode[] {
    const fixedNodes = nodes.map((node) => this.fixNode(node));
    return ASTAutoHealer.sanitizeAndHeal(fixedNodes);
  }

  /**
   * Applies a single-node (or subtree) update back into the main tree without rewriting siblings.
   */
  public applyASTDelta(fullAST: RawNode[], updatedSubNode: RawNode): RawNode[] {
    return fullAST.map((node) => {
      if (node.id === updatedSubNode.id) {
        return updatedSubNode;
      }
      if (node.children) {
        return {
          ...node,
          children: this.applyASTDelta(node.children, updatedSubNode),
        };
      }
      return node;
    });
  }

  private fixNode(node: RawNode): RawNode {
    let updatedClasses = node.className || "";

    // A. Fixed width (e.g. w-[1200px] -> w-full max-w-6xl)
    if (/w-\[\d+px\]/.test(updatedClasses)) {
      if (!/\bmax-w-/.test(updatedClasses)) {
        updatedClasses = updatedClasses.replace(/w-\[\d+px\]/g, "w-full max-w-6xl");
      } else {
        // Keep existing max-w-*, only strip the rigid pixel width
        updatedClasses = updatedClasses.replace(/w-\[\d+px\]/g, "w-full");
      }
    }

    // B. Missing wrap / mobile column for horizontal flex rows
    if (/\bflex-row\b/.test(updatedClasses) && !/\bflex-wrap\b/.test(updatedClasses)) {
      updatedClasses = updatedClasses
        .replace(/\bflex-row\b/g, "")
        .replace(/\bflex\b/g, "");
      updatedClasses = `${updatedClasses} flex flex-col md:flex-row flex-wrap`;
    }

    // C. Text overflow protection
    if (node.type === "text" && !/\bbreak-words\b/.test(updatedClasses)) {
      updatedClasses = `${updatedClasses} break-words overflow-hidden`;
    }

    const updatedChildren = node.children
      ? node.children.map((child) => this.fixNode(child))
      : undefined;

    return {
      ...node,
      className: normalizeClasses(updatedClasses),
      children: updatedChildren,
    };
  }
}

function normalizeClasses(className: string): string {
  const tokens = className
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }
  return unique.join(" ");
}
