import type { RawNode } from "../semantic-intent/types";

const TOUCH_TARGET_CLASSES = [
  "min-h-[44px]",
  "min-w-[44px]",
  "inline-flex",
  "items-center",
  "justify-center",
];

export class MobileTouchAuditor {
  /**
   * Audits & updates mobile touch targets to satisfy >= 44x44px requirements.
   */
  public auditMobileTouchTargets(nodes: RawNode[]): RawNode[] {
    const processNode = (node: RawNode): RawNode => {
      const currentClasses = (node.className || "").split(/\s+/).filter(Boolean);

      const isInteractive =
        node.type === "button" ||
        node.type === "input" ||
        node.action !== undefined ||
        node.meta?.role === "button" ||
        node.meta?.isInteractive === true;

      if (isInteractive) {
        TOUCH_TARGET_CLASSES.forEach((touchClass) => {
          if (!currentClasses.includes(touchClass)) {
            currentClasses.push(touchClass);
          }
        });
      }

      const processedChildren = node.children ? node.children.map(processNode) : undefined;

      return {
        ...node,
        className: currentClasses.join(" "),
        children: processedChildren,
      };
    };

    return nodes.map(processNode);
  }
}
