import { type RawNode, ASTAutoHealer } from "../semantic-intent/types";

/**
 * Optimizes builder AST for ultra-thin iPhone 17 Air:
 * - iOS Safari dynamic viewport (dvh)
 * - Dynamic Island + home-indicator safe areas
 * - 120Hz ProMotion GPU compositing hints
 * - 44×44pt minimum touch targets (Apple HIG)
 */
export class IPhone17AirAdapter {
  /**
   * Optimizes AST for iPhone 17 Air (120Hz ProMotion, iOS Safari, Dynamic Island).
   */
  public optimizeForIPhone17Air(nodes: RawNode[]): RawNode[] {
    const optimized = nodes.map((node) => this.optimizeNode(node));
    return ASTAutoHealer.sanitizeAndHeal(optimized);
  }

  private optimizeNode(node: RawNode): RawNode {
    let classes = node.className || "";

    // 1. Dynamic Viewport Height for iOS Safari (avoids address-bar jump)
    if (classes.includes("h-screen") || classes.includes("min-h-screen")) {
      classes = classes
        .replace(/\bh-screen\b/g, "h-[100dvh]")
        .replace(/\bmin-h-screen\b/g, "min-h-[100dvh]");
    }

    // 2. GPU acceleration for 120Hz ProMotion smoothness
    if (
      node.type === "box" &&
      (classes.includes("transition") || classes.includes("animate"))
    ) {
      if (!classes.includes("transform-gpu")) {
        classes += " transform-gpu will-change-transform";
      }
    }

    // 3. Dynamic Island & Safe Area padding
    if (
      node.id === "root" ||
      classes.includes("min-h-[100dvh]") ||
      classes.includes("h-[100dvh]")
    ) {
      if (!classes.includes("safe-area") && !classes.includes("safe-area-inset")) {
        classes +=
          " pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]";
      }
    }

    // 4. Touch target sizing (min 44×44pt for fingers on OLED)
    if (node.type === "button" || node.type === "input") {
      if (!/\bmin-h-/.test(classes)) {
        classes += " min-h-[44px]";
      }
      if (!/\bmin-w-/.test(classes)) {
        classes += " min-w-[44px]";
      }
    }

    const children = node.children
      ? node.children.map((child) => this.optimizeNode(child))
      : undefined;

    return {
      ...node,
      className: normalizeClasses(classes),
      children,
    };
  }
}

function normalizeClasses(className: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of className.trim().split(/\s+/).filter(Boolean)) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out.join(" ");
}
