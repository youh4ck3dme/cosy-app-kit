import * as Y from "yjs";
import type { RawNode } from "../semantic-intent/types";

/**
 * CRDT multiplayer engine for builder AST nodes.
 * Fine-grained Yjs array patching preserves indices/identity so concurrent
 * cursors and awareness do not collapse on every full AST rewrite.
 */
export class CRDTMultiplayerEngine {
  private doc: Y.Doc;
  private yNodes: Y.Array<RawNode>;

  constructor(doc?: Y.Doc, arrayKey = "nodes") {
    this.doc = doc ?? new Y.Doc();
    this.yNodes = this.doc.getArray<RawNode>(arrayKey);
  }

  public getDoc(): Y.Doc {
    return this.doc;
  }

  public getNodes(): RawNode[] {
    return this.yNodes.toArray();
  }

  /**
   * Idempotent fine-grained update — never wipes the full array in one shot.
   */
  public updateAST(newNodes: RawNode[]): void {
    this.doc.transact(() => {
      this.patchYjsArray(this.yNodes, newNodes);
    });
  }

  /**
   * Diffs `yArray` against `targetNodes` by id:
   * 1) delete removed ids
   * 2) insert/move/update in target order
   */
  private patchYjsArray(yArray: Y.Array<RawNode>, targetNodes: RawNode[]): void {
    // 1. Remove nodes that no longer exist in targetNodes
    const targetIds = new Set(targetNodes.map((n) => n.id));
    for (let i = yArray.length - 1; i >= 0; i--) {
      const current = yArray.get(i);
      if (!current || !targetIds.has(current.id)) {
        yArray.delete(i, 1);
      }
    }

    // 2. Update existing nodes or insert new nodes at the correct index
    targetNodes.forEach((targetNode, index) => {
      const snapshot = yArray.toArray();
      const existingInY = snapshot[index];

      if (!existingInY) {
        yArray.push([targetNode]);
        return;
      }

      if (existingInY.id !== targetNode.id) {
        // Move existing match to this index, or insert fresh
        const existingIdx = snapshot.findIndex((n) => n.id === targetNode.id);
        if (existingIdx !== -1) {
          yArray.delete(existingIdx, 1);
          // After delete, re-resolve insert index
          const insertAt = Math.min(index, yArray.length);
          yArray.insert(insertAt, [targetNode]);
        } else {
          yArray.insert(index, [targetNode]);
        }
        return;
      }

      // Same id at index — replace content only when changed
      if (JSON.stringify(existingInY) !== JSON.stringify(targetNode)) {
        yArray.delete(index, 1);
        yArray.insert(index, [targetNode]);
      }
    });

    // 3. Trim tail if target is shorter (safety after inserts)
    while (yArray.length > targetNodes.length) {
      yArray.delete(yArray.length - 1, 1);
    }
  }
}
