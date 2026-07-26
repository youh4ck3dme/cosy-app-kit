import type { RawNode, IntentType } from "./types";

export class Detector {
  public detectIntent(nodes: RawNode[]): IntentType {
    const hasInputs = nodes.some((n) => n.type === "input");
    const hasSubmit = nodes.some((n) => n.type === "button" && n.action === "submit");

    if (hasInputs && hasSubmit) {
      return "FormIntent";
    }

    const hasList = nodes.some((n) => n.type === "list");
    const hasNavLinks = nodes.some((n) => n.type === "button" && n.action === "navigate");
    if (hasList || hasNavLinks) {
      return "NavigationIntent";
    }

    return "StaticIntent";
  }
}
