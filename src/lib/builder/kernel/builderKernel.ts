import type { BuilderDocument, NodeId } from "../document/document.types";
import { cloneDocument, deepFreeze } from "../document/cloneDocument";
import { createDefaultDocument } from "../document/documentFactory";
import { parseBuilderDocument } from "../document/documentValidator";
import { validateDocument } from "../document/documentInvariants";
import type { CommandResult, ICommand } from "../commands/command.interface";
import { BatchCommand } from "../commands/impl/batch.command";
import {
  createHistoryEntry,
  HistoryManager,
  type HistoryView,
} from "../history/historyManager";
import { KernelEventBus } from "./eventBus";

export interface KernelDispatchResult extends CommandResult {
  historyEntryId?: string;
}

export interface TransactionContext {
  dispatch(command: ICommand): void;
}

/**
 * Headless Builder Kernel (Blueprint v1.1.1 + Phase 04.5.1 hardening).
 * Owns document + command history only — selection lives in BuilderUiState.
 */
export class BuilderKernel {
  private document: BuilderDocument;
  private readonly history = new HistoryManager(100);
  readonly eventBus: KernelEventBus;
  private transactionDepth = 0;

  constructor(document?: BuilderDocument, eventBus?: KernelEventBus) {
    // Always take ownership of a validated clone — never alias caller memory.
    this.document = document
      ? parseBuilderDocument(cloneDocument(document))
      : createDefaultDocument();
    this.eventBus = eventBus ?? new KernelEventBus();
  }

  /** Returns a deep clone — external mutation cannot corrupt kernel state. */
  getDocument(): BuilderDocument {
    return cloneDocument(this.document);
  }

  /**
   * Sealed external boundary: deep-cloned then deep-frozen.
   * Runtime mutations throw in strict mode; kernel state stays isolated either way.
   */
  getReadonlyDocument(): BuilderDocument {
    return deepFreeze(cloneDocument(this.document));
  }

  /** Read-only history inspection — mutators are not exposed. */
  getHistory(): HistoryView {
    return this.history.asView();
  }

  loadDocument(input: BuilderDocument | unknown): void {
    this.document = parseBuilderDocument(input);
    this.history.clear();
    this.eventBus.emit("DOCUMENT_LOADED", {
      documentId: this.document.metadata.id,
      schemaVersion: this.document.metadata.schemaVersion,
    });
  }

  dispatch(command: ICommand): KernelDispatchResult {
    if (this.transactionDepth > 0) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "TRANSACTION_NESTING_UNSUPPORTED: use TransactionContext.dispatch inside transaction()",
      };
    }

    const baseVersion = this.document.metadata.version;
    let snapshot: BuilderDocument;
    try {
      snapshot = cloneDocument(this.document);
    } catch (error) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: error instanceof Error ? error.message : "Snapshot clone failed",
      };
    }
    let result: CommandResult;
    try {
      result = command.execute(this.document);
    } catch (error) {
      this.document = snapshot;
      return {
        success: false,
        mutatedNodeIds: [],
        error: error instanceof Error ? error.message : "Command execute threw",
      };
    }

    // Any failed execute (including partial batch mutation) must restore.
    if (!result.success) {
      this.document = snapshot;
      return result;
    }

    const integrity = validateDocument(this.document);
    if (!integrity.ok) {
      this.document = snapshot;
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Post-command integrity failure: ${integrity.issues.map((i) => i.code).join(", ")}`,
      };
    }

    this.document.metadata.updatedAt = Date.now();
    this.document.metadata.version += 1;

    const entry = createHistoryEntry(command, result.mutatedNodeIds, baseVersion);
    this.history.push(entry);

    this.eventBus.emit("COMMAND_EXECUTED", {
      command: entry.serialized,
      mutatedNodeIds: entry.mutatedNodeIds,
      historyEntryId: entry.id,
    });

    return {
      ...result,
      historyEntryId: entry.id,
    };
  }

  /**
   * Atomic multi-command commit as a single history entry.
   * Accepts either a command array or a callback that queues via tx.dispatch.
   */
  transaction(
    input: ICommand[] | ((tx: TransactionContext) => void),
  ): KernelDispatchResult {
    if (this.transactionDepth > 0) {
      return {
        success: false,
        mutatedNodeIds: [],
        error: "TRANSACTION_NESTING_UNSUPPORTED",
      };
    }

    const queued: ICommand[] = [];
    if (typeof input === "function") {
      const tx: TransactionContext = {
        dispatch: (command: ICommand) => {
          queued.push(command);
        },
      };
      this.transactionDepth += 1;
      try {
        input(tx);
      } catch (error) {
        return {
          success: false,
          mutatedNodeIds: [],
          error: error instanceof Error ? error.message : "Transaction callback threw",
        };
      } finally {
        this.transactionDepth -= 1;
      }
    } else {
      queued.push(...input);
    }

    return this.dispatch(new BatchCommand(queued));
  }

  undo(): KernelDispatchResult {
    const entry = this.history.popUndo();
    if (!entry) {
      return { success: false, mutatedNodeIds: [], error: "Nothing to undo." };
    }

    let snapshot: BuilderDocument;
    try {
      snapshot = cloneDocument(this.document);
    } catch (error) {
      this.history.pushUndo(entry);
      return {
        success: false,
        mutatedNodeIds: [],
        error: error instanceof Error ? error.message : "Snapshot clone failed",
      };
    }
    const result = entry.command.undo(this.document);
    if (!result.success) {
      this.document = snapshot;
      this.history.pushUndo(entry);
      return result;
    }

    const integrity = validateDocument(this.document);
    if (!integrity.ok) {
      this.document = snapshot;
      this.history.pushUndo(entry);
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Post-undo integrity failure: ${integrity.issues.map((i) => i.code).join(", ")}`,
      };
    }

    this.document.metadata.updatedAt = Date.now();
    this.document.metadata.version += 1;
    this.history.pushRedo(entry);

    this.eventBus.emit("COMMAND_UNDONE", {
      command: entry.serialized,
      mutatedNodeIds: result.mutatedNodeIds,
      historyEntryId: entry.id,
    });

    return {
      ...result,
      historyEntryId: entry.id,
    };
  }

  redo(): KernelDispatchResult {
    const entry = this.history.popRedo();
    if (!entry) {
      return { success: false, mutatedNodeIds: [], error: "Nothing to redo." };
    }

    let snapshot: BuilderDocument;
    try {
      snapshot = cloneDocument(this.document);
    } catch (error) {
      this.history.pushRedo(entry);
      return {
        success: false,
        mutatedNodeIds: [],
        error: error instanceof Error ? error.message : "Snapshot clone failed",
      };
    }
    const result = entry.command.execute(this.document);
    if (!result.success) {
      this.document = snapshot;
      this.history.pushRedo(entry);
      return result;
    }

    const integrity = validateDocument(this.document);
    if (!integrity.ok) {
      this.document = snapshot;
      this.history.pushRedo(entry);
      return {
        success: false,
        mutatedNodeIds: [],
        error: `Post-redo integrity failure: ${integrity.issues.map((i) => i.code).join(", ")}`,
      };
    }

    this.document.metadata.updatedAt = Date.now();
    this.document.metadata.version += 1;
    this.history.pushUndo(entry);

    this.eventBus.emit("COMMAND_REDONE", {
      command: entry.serialized,
      mutatedNodeIds: result.mutatedNodeIds,
      historyEntryId: entry.id,
    });

    return {
      ...result,
      historyEntryId: entry.id,
    };
  }
}

/**
 * UI-only selection state (Blueprint v1.1.1).
 * Kept outside the kernel so canvas/inspector concerns never leak into document history.
 */
export class BuilderUiState {
  private selectedNodeIds: NodeId[] = [];

  constructor(private readonly eventBus: KernelEventBus) {}

  getSelectedNodeIds(): readonly NodeId[] {
    return this.selectedNodeIds;
  }

  setSelectedNodes(nodeIds: NodeId[]): void {
    this.selectedNodeIds = [...nodeIds];
    this.eventBus.emit("SELECTION_CHANGED", { selectedNodeIds: this.selectedNodeIds });
  }

  clearSelection(): void {
    this.setSelectedNodes([]);
  }
}

export function createBuilderSession(document?: BuilderDocument) {
  const kernel = new BuilderKernel(document);
  const ui = new BuilderUiState(kernel.eventBus);
  return { kernel, ui };
}
