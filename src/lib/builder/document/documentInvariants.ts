import type { BuilderDocument, NodeId } from "./document.types";

export type DocumentInvariantCode =
  | "ROOT_MISSING"
  | "ROOT_HAS_PARENT"
  | "ORPHAN_NODE"
  | "DANGLING_CHILD_ID"
  | "INVALID_PARENT_REFERENCE"
  | "PARENT_CHILD_ASYMMETRY"
  | "CYCLE_FOUND"
  | "DUPLICATE_CHILD_ENTRY";

export interface DocumentInvariantIssue {
  code: DocumentInvariantCode;
  message: string;
  nodeId?: NodeId;
}

export interface DocumentValidationResult {
  ok: boolean;
  issues: DocumentInvariantIssue[];
}

/**
 * Single-pass cycle detection over parent pointers (O(n) total, not O(n * depth)).
 * Each node is a functional graph edge (one parent); a 3-color walk resolves every
 * node's status exactly once by memoizing chains that were already proven acyclic.
 */
function findCyclicNodeIds(document: BuilderDocument): Set<NodeId> {
  const { nodes } = document.tree;
  const status = new Map<NodeId, "visiting" | "done">();
  const cyclic = new Set<NodeId>();

  for (const startId of Object.keys(nodes)) {
    if (status.has(startId)) continue;

    const path: NodeId[] = [];
    let cursor: NodeId | null = startId;
    while (cursor !== null && !status.has(cursor)) {
      status.set(cursor, "visiting");
      path.push(cursor);
      cursor = nodes[cursor]?.parentId ?? null;
    }

    if (cursor !== null && status.get(cursor) === "visiting") {
      const cycleStart = path.indexOf(cursor);
      for (let i = cycleStart; i < path.length; i += 1) {
        cyclic.add(path[i]!);
      }
    }

    for (const id of path) {
      status.set(id, "done");
    }
  }

  return cyclic;
}

/** Structural integrity checks beyond Zod shape validation. */
export function validateDocument(document: BuilderDocument): DocumentValidationResult {
  const issues: DocumentInvariantIssue[] = [];
  const { rootId, nodes } = document.tree;
  const root = nodes[rootId];

  if (!root) {
    issues.push({
      code: "ROOT_MISSING",
      message: `rootId ${rootId} is missing from nodes map`,
      nodeId: rootId,
    });
    return { ok: false, issues };
  }

  if (root.parentId !== null) {
    issues.push({
      code: "ROOT_HAS_PARENT",
      message: `Root node ${rootId} must have parentId null`,
      nodeId: rootId,
    });
  }

  const reachable = new Set<NodeId>();
  const stack: NodeId[] = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const node = nodes[id];
    if (!node) continue;

    const seenChildren = new Set<string>();
    for (const childId of node.children) {
      if (seenChildren.has(childId)) {
        issues.push({
          code: "DUPLICATE_CHILD_ENTRY",
          message: `Node ${id} lists child ${childId} more than once`,
          nodeId: id,
        });
      }
      seenChildren.add(childId);

      const child = nodes[childId];
      if (!child) {
        issues.push({
          code: "DANGLING_CHILD_ID",
          message: `Node ${id} references missing child ${childId}`,
          nodeId: id,
        });
        continue;
      }
      if (child.parentId !== id) {
        issues.push({
          code: "PARENT_CHILD_ASYMMETRY",
          message: `Child ${childId} parentId is ${child.parentId}, expected ${id}`,
          nodeId: childId,
        });
      }
      stack.push(childId);
    }
  }

  const cyclicNodeIds = findCyclicNodeIds(document);

  for (const [id, node] of Object.entries(nodes)) {
    if (!reachable.has(id)) {
      issues.push({
        code: "ORPHAN_NODE",
        message: `Node ${id} is not reachable from root`,
        nodeId: id,
      });
    }

    if (node.parentId !== null) {
      const parent = nodes[node.parentId];
      if (!parent) {
        issues.push({
          code: "INVALID_PARENT_REFERENCE",
          message: `Node ${id} parentId ${node.parentId} does not exist`,
          nodeId: id,
        });
      } else if (!parent.children.includes(id)) {
        issues.push({
          code: "PARENT_CHILD_ASYMMETRY",
          message: `Parent ${node.parentId} children does not include ${id}`,
          nodeId: id,
        });
      }
    }

    if (cyclicNodeIds.has(id)) {
      issues.push({
        code: "CYCLE_FOUND",
        message: `Cycle detected walking parents from ${id}`,
        nodeId: id,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

export function assertValidDocument(document: BuilderDocument): void {
  const result = validateDocument(document);
  if (!result.ok) {
    const summary = result.issues.map((i) => i.code).join(", ");
    throw new Error(`Document failed integrity validation: ${summary}`);
  }
}
