import type { CommandResult, ICommand, SerializedCommand } from "../command.interface";
import type { BuilderDocument } from "../../document/document.types";

export interface BatchPayload {
  count: number;
  commands?: SerializedCommand[];
}

/**
 * Executes nested commands as one history entry.
 * Nested commands are not individually pushed onto the history stack.
 */
export class BatchCommand implements ICommand<BatchPayload> {
  readonly id: string;
  readonly type = "BATCH";
  readonly timestamp: number;
  readonly payload: BatchPayload;
  private readonly commands: ICommand[];
  private executed: ICommand[] = [];

  constructor(commands: ICommand[], id?: string, timestamp?: number) {
    this.commands = commands;
    this.payload = { count: commands.length };
    this.id = id ?? crypto.randomUUID();
    this.timestamp = timestamp ?? Date.now();
  }

  getCommands(): readonly ICommand[] {
    return this.commands;
  }

  execute(document: BuilderDocument): CommandResult {
    this.executed = [];
    const mutated = new Set<string>();

    for (const command of this.commands) {
      const result = command.execute(document);
      if (!result.success) {
        // Best-effort nested undo; kernel always snapshot-restores on failure.
        const undoErrors: string[] = [];
        for (let i = this.executed.length - 1; i >= 0; i -= 1) {
          const undoResult = this.executed[i]!.undo(document);
          if (!undoResult.success) {
            undoErrors.push(
              undoResult.error ?? `Batch nested undo failed for ${this.executed[i]!.type}`,
            );
          }
        }
        this.executed = [];
        return {
          success: false,
          mutatedNodeIds: [],
          error:
            undoErrors.length > 0
              ? `${result.error ?? `Batch failed at ${command.type}`}; nested undo incomplete: ${undoErrors.join("; ")}`
              : (result.error ?? `Batch failed at ${command.type}`),
        };
      }
      this.executed.push(command);
      for (const id of result.mutatedNodeIds) mutated.add(id);
    }

    return {
      success: true,
      mutatedNodeIds: [...mutated],
      metadata: { count: this.executed.length },
    };
  }

  undo(document: BuilderDocument): CommandResult {
    const mutated = new Set<string>();
    const list = this.executed.length > 0 ? this.executed : this.commands;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const result = list[i]!.undo(document);
      if (!result.success) {
        return {
          success: false,
          mutatedNodeIds: [...mutated],
          error: result.error ?? "Batch undo failed",
        };
      }
      for (const id of result.mutatedNodeIds) mutated.add(id);
    }
    return {
      success: true,
      mutatedNodeIds: [...mutated],
    };
  }

  serialize(): SerializedCommand<BatchPayload> {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      payload: {
        count: this.commands.length,
        commands: this.commands.map((c) => c.serialize()),
      },
    };
  }
}
