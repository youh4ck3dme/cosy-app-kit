import type {
  CommandResult,
  ICommand,
  SerializedCommand,
} from "../command.interface";
import type { BuilderDocument, BuilderNode, NodeId } from "../../document/document.types";
import { cloneNode } from "../../document/cloneDocument";
import { collectDescendantIds } from "../../nodes/nodeGraph";

export interface RemoveNodePayload {
  nodeId: NodeId;
}

interface RemoveNodeInverse {
  parentId: NodeId | null;
  index: number;
  nodes: Record<string, BuilderNode>;
}

export class RemoveNodeCommand implements ICommand<RemoveNodePayload> {
  readonly id: string;
  readonly type = "REMOVE_NODE";
  readonly timestamp: number;
  readonly payload: RemoveNodePayload;
  private inverse: RemoveNodeInverse | null = null;

  constructor(
    payload: RemoveNodePayload,
    id?: string,
    timestamp?: number,
    inverse?: RemoveNodeInverse | null,
  ) {
    this.payload = payload;
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? Date.now();
    this.inverse = inverse ?? null;
  }

  execute(document: BuilderDocument): CommandResult {
    const { tree } = document;
    const node = tree.nodes[this.payload.nodeId];

    if (!node) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Node ${this.payload.nodeId} does not exist.`,
      };
    }

    if (node.id === tree.rootId) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "Cannot remove the document root node.",
      };
    }

    const descendantIds = collectDescendantIds(document, node.id);
    const allIds = [node.id, ...descendantIds];
    const nodesSnapshot: RemoveNodeInverse["nodes"] = {};
    for (const id of allIds) {
      const current = tree.nodes[id];
      if (current) {
        nodesSnapshot[id] = cloneNode(current);
      }
    }

    const parentId = node.parentId;
    let index = -1;
    if (parentId) {
      const parent = tree.nodes[parentId];
      if (!parent) {
        return {
          success: false,
          mutatedNodeIds: [],
          error: `Parent ${parentId} missing for node ${node.id}.`,
        };
      }
      index = parent.children.indexOf(node.id);
      parent.children = parent.children.filter((id) => id !== node.id);
      parent.metadata.updatedAt = Date.now();
      parent.metadata.version += 1;
    }

    this.inverse = { parentId, index, nodes: nodesSnapshot };

    for (const id of allIds) {
      delete tree.nodes[id];
    }

    return {
      success: true,
      mutatedNodeIds: parentId ? [...allIds, parentId] : allIds,
      metadata: { removedCount: allIds.length },
    };
  }

  undo(document: BuilderDocument): CommandResult {
    if (!this.inverse) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "No remove snapshot available to undo.",
      };
    }

    const { tree } = document;
    const restoredIds = Object.keys(this.inverse.nodes);

    for (const [id, node] of Object.entries(this.inverse.nodes)) {
      tree.nodes[id] = cloneNode(node);
    }

    const { parentId, index } = this.inverse;
    if (parentId) {
      const parent = tree.nodes[parentId];
      if (!parent) {
        return {
          success: false,
          mutatedNodeIds: restoredIds,
          error: `Parent ${parentId} missing during undo.`,
        };
      }
      if (index >= 0 && index <= parent.children.length) {
        parent.children.splice(index, 0, this.payload.nodeId);
      } else {
        parent.children.push(this.payload.nodeId);
      }
      parent.metadata.updatedAt = Date.now();
      parent.metadata.version += 1;
      return {
        success: true,
        mutatedNodeIds: [...restoredIds, parentId],
      };
    }

    return {
      success: true,
      mutatedNodeIds: restoredIds,
    };
  }

  serialize(): SerializedCommand<RemoveNodePayload> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: this.payload,
      inverse: this.inverse ? structuredClone(this.inverse) : undefined,
    };
  }

  static fromSerialized(serialized: SerializedCommand<RemoveNodePayload>): RemoveNodeCommand {
    return new RemoveNodeCommand(
      serialized.payload,
      serialized.id,
      serialized.timestamp,
      (serialized.inverse as RemoveNodeInverse | undefined) ?? null,
    );
  }
}
