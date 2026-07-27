import type { RawNode, IntentType } from "./types";

export class Detector {
  public detectIntent(nodes: RawNode[]): IntentType {
    const flattenNodes = (items: RawNode[]): RawNode[] => {
      const result: RawNode[] = [];
      for (const item of items) {
        result.push(item);
        if (item.children && item.children.length > 0) {
          result.push(...flattenNodes(item.children));
        }
      }
      return result;
    };

    const allNodes = flattenNodes(nodes);
    const hasInputs = allNodes.some((n) => n.type === "input");
    const hasSubmit = allNodes.some((n) => n.type === "button" && n.action === "submit");

    if (hasInputs || hasSubmit) {
      return "FormIntent";
    }

    const hasList = allNodes.some((n) => n.type === "list");
    const hasNavLinks = allNodes.some((n) => n.type === "button" && n.action === "navigate");
    if (hasList || hasNavLinks) {
      return "NavigationIntent";
    }

    return "StaticIntent";
  }
}

