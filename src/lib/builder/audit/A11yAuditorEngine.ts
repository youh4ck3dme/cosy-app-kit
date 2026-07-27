import type { RawNode } from "../semantic-intent/types";

export interface AuditFixResult {
  fixedNodes: RawNode[];
  violationsCount: number;
}

export class A11yAuditorEngine {
  /**
   * Audits and automatically applies ARIA fixes for accessibility compliance.
   */
  public auditAndFix(nodes: RawNode[]): AuditFixResult {
    let violationsCount = 0;

    const processNode = (node: RawNode): RawNode => {
      const updatedMeta = { ...(node.meta || {}) };
      let updatedLabel = node.label;

      // 1. Icon buttons without text must receive aria-label from meta.figmaName or ID
      if (node.type === "button" && !node.text && !node.label && !updatedMeta["aria-label"]) {
        const fallbackLabel =
          typeof updatedMeta.figmaName === "string" ? updatedMeta.figmaName : `Button ${node.id}`;
        updatedMeta["aria-label"] = fallbackLabel;
        updatedLabel = fallbackLabel;
        violationsCount++;
      }

      // 2. Input fields without label/name must have aria-label
      if (node.type === "input" && !node.label && !node.name && !updatedMeta["aria-label"]) {
        const inputLabel =
          typeof updatedMeta.figmaName === "string" ? updatedMeta.figmaName : `Input ${node.id}`;
        updatedMeta["aria-label"] = inputLabel;
        updatedLabel = inputLabel;
        violationsCount++;
      }

      // 3. Images (box with isImage/imgSrc/figmaName) must have alt attribute
      const isImage =
        updatedMeta.isImage === true ||
        Boolean(updatedMeta.imgSrc) ||
        (typeof updatedMeta.figmaName === "string" &&
          updatedMeta.figmaName.toLowerCase().includes("image"));

      if (isImage && !updatedMeta.alt) {
        updatedMeta.alt =
          typeof updatedMeta.figmaName === "string" ? updatedMeta.figmaName : `Image ${node.id}`;
        violationsCount++;
      }

      // 4. Interactive boxes with action property must receive role="button"
      if (node.type === "box" && node.action && !updatedMeta.role) {
        updatedMeta.role = "button";
        violationsCount++;
      }

      const processedChildren = node.children ? node.children.map(processNode) : undefined;

      return {
        ...node,
        label: updatedLabel,
        meta: updatedMeta,
        children: processedChildren,
      };
    };

    const fixedNodes = nodes.map(processNode);
    return { fixedNodes, violationsCount };
  }
}
