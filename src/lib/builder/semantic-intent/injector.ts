import type { RawNode, IntentType, SmartNode } from "./types";

export class StateInjector {
  public injectState(intent: IntentType, nodes: RawNode[]): SmartNode[] {
    if (intent === "FormIntent") {
      return this.injectFormState(nodes);
    }

    return nodes.map((node) => ({
      ...node,
      isInteractive: false,
    }));
  }

  private injectFormState(nodes: RawNode[]): SmartNode[] {
    return nodes.map((node) => {
      const smartNode: SmartNode = { ...node, isInteractive: true };

      if (node.type === "input" && node.name) {
        smartNode.stateKey = node.name;
        smartNode.eventHandlers = { onChange: true };
      } else if (node.type === "button" && node.action === "submit") {
        smartNode.eventHandlers = { onSubmit: true };
      }

      return smartNode;
    });
  }
}
