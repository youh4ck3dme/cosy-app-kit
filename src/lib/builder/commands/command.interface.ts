import type { BuilderDocument } from "../document/document.types";

export interface CommandResult {
  success: boolean;
  mutatedNodeIds: string[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface SerializedCommand<TPayload = unknown> {
  id: string;
  type: string;
  timestamp: number;
  payload: TPayload;
  /** Durable undo material — must be JSON-serializable (no live instance fields). */
  inverse?: unknown;
  baseDocumentVersion?: number;
}

export interface ICommand<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly payload: TPayload;

  execute(document: BuilderDocument): CommandResult;
  undo(document: BuilderDocument): CommandResult;
  serialize(): SerializedCommand<TPayload>;
}

export type CommandFactory = (serialized: SerializedCommand<unknown>) => ICommand;
