import type { RawNode, IntentType, SmartNode } from "./types";

export class StateInjector {
  public injectState(intent: IntentType, nodes: RawNode[]): SmartNode[] {
    if (intent === "FormIntent") {
      return this.injectFormState(nodes);
    }

    return this.mapRecursive(nodes, (node) => ({
      ...node,
      isInteractive: false,
    }));
  }

  private injectFormState(nodes: RawNode[]): SmartNode[] {
    return this.mapRecursive(nodes, (node) => {
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

  private mapRecursive(nodes: RawNode[], fn: (node: RawNode) => SmartNode): SmartNode[] {
    return nodes.map((node) => {
      const processed = fn(node);
      if (node.children && node.children.length > 0) {
        processed.children = this.mapRecursive(node.children, fn);
      }
      return processed;
    });
  }
}
