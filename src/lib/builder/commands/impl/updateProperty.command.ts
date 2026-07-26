import type {
  CommandResult,
  ICommand,
  SerializedCommand,
} from "../command.interface";
import type { BuilderDocument, NodeId } from "../../document/document.types";
import { isCloneable } from "../../document/cloneDocument";

export interface UpdatePropertyPayload {
  nodeId: NodeId;
  /** Dot-notation path relative to the node, e.g. `props.text` or `style.color`. */
  path: string;
  value: unknown;
}

interface UpdatePropertyInverse {
  previousValue: unknown;
  hadPrevious: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAtPath(target: Record<string, unknown>, pathParts: string[]): unknown {
  let current: unknown = target;
  for (const part of pathParts) {
    if (!isPlainObject(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function setAtPath(
  target: Record<string, unknown>,
  pathParts: string[],
  value: unknown,
): boolean {
  if (pathParts.length === 0) return false;

  let current: Record<string, unknown> = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const part = pathParts[i]!;
    const next = current[part];
    if (!isPlainObject(next)) {
      return false;
    }
    current = next;
  }

  current[pathParts[pathParts.length - 1]!] = value;
  return true;
}

const FORBIDDEN_ROOT_PATHS = new Set(["id", "parentId", "children", "type"]);

/** Segments that enable prototype pollution or structural graph bypass. */
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

function assertSafePath(pathParts: string[]): string | null {
  for (const part of pathParts) {
    if (FORBIDDEN_PATH_SEGMENTS.has(part)) {
      return `Path segment "${part}" is forbidden (prototype pollution guard).`;
    }
  }
  return null;
}

export class UpdatePropertyCommand implements ICommand<UpdatePropertyPayload> {
  readonly id: string;
  readonly type = "UPDATE_PROPERTY";
  readonly timestamp: number;
  readonly payload: UpdatePropertyPayload;
  private inverse: UpdatePropertyInverse = { previousValue: undefined, hadPrevious: false };

  constructor(
    payload: UpdatePropertyPayload,
    id?: string,
    timestamp?: number,
    inverse?: UpdatePropertyInverse,
  ) {
    this.payload = payload;
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? Date.now();
    if (inverse) this.inverse = inverse;
  }

  execute(document: BuilderDocument): CommandResult {
    const node = document.tree.nodes[this.payload.nodeId];
    if (!node) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Node ${this.payload.nodeId} does not exist.`,
      };
    }

    const pathParts = this.payload.path.split(".").filter(Boolean);
    if (pathParts.length === 0) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "Property path must not be empty.",
      };
    }

    if (FORBIDDEN_ROOT_PATHS.has(pathParts[0]!)) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Path "${this.payload.path}" cannot be updated via UpdatePropertyCommand.`,
      };
    }

    const unsafe = assertSafePath(pathParts);
    if (unsafe) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: unsafe,
      };
    }

    if (!isCloneable(this.payload.value)) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Property value at "${this.payload.path}" is not serializable (functions, symbols, and other non-cloneable values are rejected).`,
      };
    }

    const nodeRecord = node as unknown as Record<string, unknown>;
    const previousValue = getAtPath(nodeRecord, pathParts);
    this.inverse = {
      previousValue:
        previousValue === undefined ? undefined : structuredClone(previousValue),
      hadPrevious: true,
    };

    const ok = setAtPath(nodeRecord, pathParts, this.payload.value);
    if (!ok) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Unable to set path "${this.payload.path}" on node ${this.payload.nodeId}.`,
      };
    }

    node.metadata.updatedAt = Date.now();
    node.metadata.version += 1;

    return {
      success: true,
      mutatedNodeIds: [node.id],
      metadata: { path: this.payload.path },
    };
  }

  undo(document: BuilderDocument): CommandResult {
    if (!this.inverse.hadPrevious) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "No previous value captured for undo.",
      };
    }

    const node = document.tree.nodes[this.payload.nodeId];
    if (!node) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Node ${this.payload.nodeId} does not exist.`,
      };
    }

    const pathParts = this.payload.path.split(".").filter(Boolean);
    const unsafe = assertSafePath(pathParts);
    if (unsafe) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: unsafe,
      };
    }

    const nodeRecord = node as unknown as Record<string, unknown>;
    const ok = setAtPath(nodeRecord, pathParts, this.inverse.previousValue);
    if (!ok) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Unable to restore path "${this.payload.path}".`,
      };
    }

    node.metadata.updatedAt = Date.now();
    node.metadata.version += 1;

    return {
      success: true,
      mutatedNodeIds: [node.id],
    };
  }

  serialize(): SerializedCommand<UpdatePropertyPayload> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: this.payload,
      inverse: structuredClone(this.inverse),
    };
  }

  static fromSerialized(serialized: SerializedCommand<UpdatePropertyPayload>): UpdatePropertyCommand {
    return new UpdatePropertyCommand(
      serialized.payload,
      serialized.id,
      serialized.timestamp,
      (serialized.inverse as UpdatePropertyInverse | undefined) ?? undefined,
    );
  }
}
