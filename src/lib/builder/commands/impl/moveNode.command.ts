import type { CommandResult, ICommand, SerializedCommand } from "../command.interface";
import type { BuilderDocument, NodeId } from "../../document/document.types";

export interface MoveNodePayload {
  nodeId: NodeId;
  newParentId: NodeId;
  index?: number;
}

interface MoveSnapshot {
  previousParentId: NodeId;
  previousIndex: number;
}

export class MoveNodeCommand implements ICommand<MoveNodePayload> {
  readonly id: string;
  readonly type = "MOVE_NODE";
  readonly timestamp: number;
  readonly payload: MoveNodePayload;
  private inverse: MoveSnapshot | null = null;

  constructor(
    payload: MoveNodePayload,
    id?: string,
    timestamp?: number,
    inverse?: MoveSnapshot | null,
  ) {
    this.payload = payload;
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? Date.now();
    this.inverse = inverse ?? null;
  }

  execute(document: BuilderDocument): CommandResult {
    const { tree } = document;
    const node = tree.nodes[this.payload.nodeId];
    const newParent = tree.nodes[this.payload.newParentId];

    if (!node) {
      return { success: false, mutatedNodeIds: [], error: `Node ${this.payload.nodeId} missing.` };
    }
    if (!newParent) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Parent ${this.payload.newParentId} missing.`,
      };
    }
    if (node.id === tree.rootId) {
      return { success: false, mutatedNodeIds: [], error: "Cannot move the root node." };
    }
    if (!node.parentId) {
      return { success: false, mutatedNodeIds: [], error: "Node has no parent." };
    }
    if (node.id === this.payload.newParentId) {
      return { success: false, mutatedNodeIds: [], error: "Cannot move a node into itself." };
    }

    let cursor: NodeId | null = this.payload.newParentId;
    while (cursor) {
      if (cursor === node.id) {
        return {
          success: false,
          mutatedNodeIds: [],
          error: "Cannot move a node under its own descendant.",
        };
      }
      cursor = tree.nodes[cursor]?.parentId ?? null;
    }

    const oldParent = tree.nodes[node.parentId];
    if (!oldParent) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Previous parent ${node.parentId} missing.`,
      };
    }

    const previousIndex = oldParent.children.indexOf(node.id);
    this.inverse = {
      previousParentId: oldParent.id,
      previousIndex,
    };

    oldParent.children = oldParent.children.filter((id) => id !== node.id);
    oldParent.metadata.updatedAt = Date.now();
    oldParent.metadata.version += 1;

    const index = this.payload.index;
    if (index !== undefined && index >= 0 && index <= newParent.children.length) {
      newParent.children.splice(index, 0, node.id);
    } else {
      newParent.children.push(node.id);
    }

    node.parentId = newParent.id;
    node.metadata.updatedAt = Date.now();
    node.metadata.version += 1;
    newParent.metadata.updatedAt = Date.now();
    newParent.metadata.version += 1;

    return {
      success: true,
      mutatedNodeIds: [node.id, oldParent.id, newParent.id],
    };
  }

  undo(document: BuilderDocument): CommandResult {
    if (!this.inverse) {
      return { success: false, mutatedNodeIds: [], error: "No move snapshot available." };
    }

    const { tree } = document;
    const node = tree.nodes[this.payload.nodeId];
    const currentParent = tree.nodes[this.payload.newParentId];
    const previousParent = tree.nodes[this.inverse.previousParentId];

    if (!node || !currentParent || !previousParent) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "Unable to restore move; graph changed unexpectedly.",
      };
    }

    currentParent.children = currentParent.children.filter((id) => id !== node.id);
    if (
      this.inverse.previousIndex >= 0 &&
      this.inverse.previousIndex <= previousParent.children.length
    ) {
      previousParent.children.splice(this.inverse.previousIndex, 0, node.id);
    } else {
      previousParent.children.push(node.id);
    }

    node.parentId = previousParent.id;
    node.metadata.updatedAt = Date.now();
    node.metadata.version += 1;
    currentParent.metadata.updatedAt = Date.now();
    currentParent.metadata.version += 1;
    previousParent.metadata.updatedAt = Date.now();
    previousParent.metadata.version += 1;

    return {
      success: true,
      mutatedNodeIds: [node.id, currentParent.id, previousParent.id],
    };
  }

  serialize(): SerializedCommand<MoveNodePayload> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: this.payload,
      inverse: this.inverse ? structuredClone(this.inverse) : undefined,
    };
  }

  static fromSerialized(serialized: SerializedCommand<MoveNodePayload>): MoveNodeCommand {
    return new MoveNodeCommand(
      serialized.payload,
      serialized.id,
      serialized.timestamp,
      (serialized.inverse as MoveSnapshot | undefined) ?? null,
    );
  }
}
