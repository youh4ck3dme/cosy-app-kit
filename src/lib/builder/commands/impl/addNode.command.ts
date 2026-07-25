import type {
  CommandResult,
  ICommand,
  SerializedCommand,
} from "../command.interface";
import type { BuilderDocument, BuilderNode, NodeId } from "../../document/document.types";

export interface AddNodePayload {
  parentId: NodeId;
  node: BuilderNode;
  index?: number;
}

export class AddNodeCommand implements ICommand<AddNodePayload> {
  readonly id: string;
  readonly type = "ADD_NODE";
  readonly timestamp: number;
  readonly payload: AddNodePayload;

  constructor(payload: AddNodePayload, id?: string, timestamp?: number) {
    this.payload = payload;
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? Date.now();
  }

  execute(document: BuilderDocument): CommandResult {
    const { tree } = document;
    const parent = tree.nodes[this.payload.parentId];

    if (!parent) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Parent node ${this.payload.parentId} does not exist in graph.`,
      };
    }

    if (tree.nodes[this.payload.node.id]) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Node ${this.payload.node.id} already exists in graph.`,
      };
    }

    if (this.payload.node.parentId !== null && this.payload.node.parentId !== this.payload.parentId) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Node parentId mismatch: expected ${this.payload.parentId}.`,
      };
    }

    const newNode: BuilderNode = {
      ...this.payload.node,
      parentId: this.payload.parentId,
      children: [...this.payload.node.children],
    };
    tree.nodes[newNode.id] = newNode;

    const index = this.payload.index;
    if (index !== undefined && index >= 0 && index <= parent.children.length) {
      parent.children.splice(index, 0, newNode.id);
    } else {
      parent.children.push(newNode.id);
    }

    parent.metadata.updatedAt = Date.now();
    parent.metadata.version += 1;

    return {
      success: true,
      mutatedNodeIds: [newNode.id, parent.id],
    };
  }

  undo(document: BuilderDocument): CommandResult {
    const { tree } = document;
    const parent = tree.nodes[this.payload.parentId];
    const nodeId = this.payload.node.id;

    if (parent) {
      parent.children = parent.children.filter((id) => id !== nodeId);
      parent.metadata.updatedAt = Date.now();
      parent.metadata.version += 1;
    }

    delete tree.nodes[nodeId];

    return {
      success: true,
      mutatedNodeIds: [nodeId, this.payload.parentId],
    };
  }

  serialize(): SerializedCommand<AddNodePayload> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: this.payload,
    };
  }

  static fromSerialized(serialized: SerializedCommand<AddNodePayload>): AddNodeCommand {
    return new AddNodeCommand(serialized.payload, serialized.id, serialized.timestamp);
  }
}
