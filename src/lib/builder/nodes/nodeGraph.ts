import type { BuilderDocument, NodeId } from "../document/document.types";

/** O(1) node lookup and tree helpers over the normalized node graph. */
export function getNode(document: BuilderDocument, nodeId: NodeId) {
  return document.tree.nodes[nodeId];
}

export function collectDescendantIds(document: BuilderDocument, nodeId: NodeId): NodeId[] {
  const node = document.tree.nodes[nodeId];
  if (!node) return [];

  const result: NodeId[] = [];
  const stack = [...node.children];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    result.push(currentId);
    const current = document.tree.nodes[currentId];
    if (current?.children.length) {
      stack.push(...current.children);
    }
  }

  return result;
}

export function walkNodeIds(document: BuilderDocument, rootId?: NodeId): NodeId[] {
  const start = rootId ?? document.tree.rootId;
  const ordered: NodeId[] = [];
  const visit = (id: NodeId) => {
    ordered.push(id);
    const node = document.tree.nodes[id];
    if (!node) return;
    for (const childId of node.children) {
      visit(childId);
    }
  };
  visit(start);
  return ordered;
}
