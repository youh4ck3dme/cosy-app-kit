import type { BuilderDocument, NodeId } from "../document/document.types";
import { createDefaultDocument } from "../document/documentFactory";
import { parseBuilderDocument } from "../document/documentValidator";
import type { CommandResult, ICommand } from "../commands/command.interface";
import { createHistoryEntry, HistoryManager } from "../history/historyManager";
import { KernelEventBus } from "./eventBus";

export interface KernelDispatchResult extends CommandResult {
  historyEntryId?: string;
}

/**
 * Headless Builder Kernel (Blueprint v1.1.1).
 * Owns document + command history only — selection lives in BuilderUiState.
 * No React / Zustand dependency; UI layers subscribe via the event bus.
 */
export class BuilderKernel {
  private document: BuilderDocument;
  private readonly history = new HistoryManager();
  readonly eventBus: KernelEventBus;

  constructor(document?: BuilderDocument, eventBus?: KernelEventBus) {
    this.document = document ?? createDefaultDocument();
    this.eventBus = eventBus ?? new KernelEventBus();
  }

  getDocument(): BuilderDocument {
    return this.document;
  }

  getHistory(): HistoryManager {
    return this.history;
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
    const result = command.execute(this.document);
    if (!result.success) {
      return result;
    }

    this.document.metadata.updatedAt = Date.now();
    this.document.metadata.version += 1;

    const entry = createHistoryEntry(command, result.mutatedNodeIds);
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

  undo(): KernelDispatchResult {
    const entry = this.history.popUndo();
    if (!entry) {
      return { success: false, mutatedNodeIds: [], error: "Nothing to undo." };
    }

    const result = entry.command.undo(this.document);
    if (!result.success) {
      this.history.pushUndo(entry);
      return result;
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

    const result = entry.command.execute(this.document);
    if (!result.success) {
      this.history.pushRedo(entry);
      return result;
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
