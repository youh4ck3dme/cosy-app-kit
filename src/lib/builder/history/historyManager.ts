import type { ICommand, SerializedCommand } from "../commands/command.interface";

export interface HistoryEventLogEntry {
  id: string;
  type: string;
  timestamp: number;
  payload: unknown;
  inverse?: unknown;
  mutatedNodeIds: string[];
  baseDocumentVersion?: number;
}

/**
 * HistoryEntry abstraction (Blueprint v1.1.1 / hardening).
 * Separates durable serialized audit/replay data from the live undo executor.
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  commandType: string;
  serialized: SerializedCommand;
  mutatedNodeIds: string[];
  baseDocumentVersion?: number;
  /** Live command instance used for undo/redo within the session. */
  command: ICommand;
}

export function createHistoryEntry(
  command: ICommand,
  mutatedNodeIds: string[],
  baseDocumentVersion?: number,
): HistoryEntry {
  const serialized = command.serialize();
  if (baseDocumentVersion !== undefined) {
    serialized.baseDocumentVersion = baseDocumentVersion;
  }
  return {
    id: serialized.id,
    timestamp: serialized.timestamp,
    commandType: serialized.type,
    serialized,
    mutatedNodeIds: [...mutatedNodeIds],
    baseDocumentVersion,
    command,
  };
}

/** External inspection surface — no mutators (clear/push/pop). */
export interface HistoryView {
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): readonly HistoryEntry[];
  getRedoStack(): readonly HistoryEntry[];
  exportSerialized(): SerializedCommand[];
  exportEventLog(): HistoryEventLogEntry[];
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  constructor(private readonly maxHistoryEntries = 100) {}

  getUndoStack(): readonly HistoryEntry[] {
    return this.undoStack;
  }

  getRedoStack(): readonly HistoryEntry[] {
    return this.redoStack;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    this.redoStack = [];
    while (this.undoStack.length > this.maxHistoryEntries) {
      this.undoStack.shift();
    }
  }

  popUndo(): HistoryEntry | undefined {
    return this.undoStack.pop();
  }

  popRedo(): HistoryEntry | undefined {
    return this.redoStack.pop();
  }

  pushRedo(entry: HistoryEntry): void {
    this.redoStack.push(entry);
  }

  pushUndo(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    while (this.undoStack.length > this.maxHistoryEntries) {
      this.undoStack.shift();
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Serialized history suitable for audit / AI replay (no live command instances). */
  exportSerialized(): SerializedCommand[] {
    return this.undoStack.map((entry) => entry.serialized);
  }

  exportEventLog(): HistoryEventLogEntry[] {
    return this.undoStack.map((entry) => ({
      id: entry.id,
      type: entry.commandType,
      timestamp: entry.timestamp,
      payload: entry.serialized.payload,
      inverse: entry.serialized.inverse,
      mutatedNodeIds: [...entry.mutatedNodeIds],
      baseDocumentVersion: entry.baseDocumentVersion,
    }));
  }

  /** Sealed view for external consumers — no clear/push/pop. */
  asView(): HistoryView {
    return {
      canUndo: () => this.canUndo(),
      canRedo: () => this.canRedo(),
      getUndoStack: () => this.getUndoStack(),
      getRedoStack: () => this.getRedoStack(),
      exportSerialized: () => this.exportSerialized(),
      exportEventLog: () => this.exportEventLog(),
    };
  }
}
