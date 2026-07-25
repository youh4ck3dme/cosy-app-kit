import type { ICommand, SerializedCommand } from "../commands/command.interface";

/**
 * HistoryEntry abstraction (Blueprint v1.1.1).
 * Separates durable serialized audit/replay data from the live undo executor.
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  commandType: string;
  serialized: SerializedCommand;
  mutatedNodeIds: string[];
  /** Live command instance used for undo/redo within the session. */
  command: ICommand;
}

export function createHistoryEntry(
  command: ICommand,
  mutatedNodeIds: string[],
): HistoryEntry {
  const serialized = command.serialize();
  return {
    id: serialized.id,
    timestamp: serialized.timestamp,
    commandType: serialized.type,
    serialized,
    mutatedNodeIds: [...mutatedNodeIds],
    command,
  };
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

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
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Serialized history suitable for audit / AI replay (no live command instances). */
  exportSerialized(): SerializedCommand[] {
    return this.undoStack.map((entry) => entry.serialized);
  }
}
