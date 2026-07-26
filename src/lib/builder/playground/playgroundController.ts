/**
 * Headless Builder Kernel playground session — developer tooling only.
 * Wraps existing kernel APIs; does not change kernel architecture.
 */
import type { BuilderDocument } from "../document/document.types";
import {
  createDefaultDocument,
  createNodeFromDefaults,
} from "../document/documentFactory";
import {
  validateDocument,
  type DocumentValidationResult,
} from "../document/documentInvariants";
import { AddNodeCommand } from "../commands/impl/addNode.command";
import { RemoveNodeCommand } from "../commands/impl/removeNode.command";
import { UpdatePropertyCommand } from "../commands/impl/updateProperty.command";
import type { HistoryEventLogEntry } from "../history/historyManager";
import type { KernelEvent, KernelEventType } from "../kernel/eventBus";
import type { KernelDispatchResult } from "../kernel/builderKernel";
import {
  bootstrapBuilderKernel,
  type BootstrappedKernel,
} from "../kernel/kernelFacade";

const ALL_EVENT_TYPES: KernelEventType[] = [
  "NODE_CREATED",
  "NODE_UPDATED",
  "NODE_DELETED",
  "SELECTION_CHANGED",
  "DOCUMENT_SAVED",
  "DOCUMENT_LOADED",
  "COMMAND_EXECUTED",
  "COMMAND_UNDONE",
  "COMMAND_REDONE",
  "PLUGIN_REGISTERED",
];

export interface PlaygroundSnapshot {
  document: BuilderDocument;
  validation: DocumentValidationResult;
  canUndo: boolean;
  canRedo: boolean;
  historyLog: HistoryEventLogEntry[];
  events: readonly KernelEvent[];
  lastResult: KernelDispatchResult | null;
  version: number;
}

export type PlaygroundListener = () => void;

const MAX_EVENTS = 200;

export class BuilderPlaygroundController {
  private readonly session: BootstrappedKernel;
  private readonly listeners = new Set<PlaygroundListener>();
  private events: KernelEvent[] = [];
  private lastResult: KernelDispatchResult | null = null;
  private unsubscribers: Array<() => void> = [];

  constructor(session?: BootstrappedKernel) {
    this.session =
      session ??
      bootstrapBuilderKernel({
        document: createDefaultDocument({ title: "Playground Document" }),
      });
    this.wireEvents();
  }

  private wireEvents(): void {
    for (const type of ALL_EVENT_TYPES) {
      this.unsubscribers.push(
        this.session.eventBus.subscribe(type, (event) => {
          this.events = [...this.events, event].slice(-MAX_EVENTS);
          this.emit();
        }),
      );
    }
  }

  dispose(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.listeners.clear();
  }

  subscribe(listener: PlaygroundListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  getSnapshot(): PlaygroundSnapshot {
    const document = this.session.kernel.getDocument();
    const history = this.session.kernel.getHistory();
    return {
      document,
      validation: validateDocument(document),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
      historyLog: history.exportEventLog(),
      events: this.events,
      lastResult: this.lastResult,
      version: document.metadata.version,
    };
  }

  /** Convenience: get kernel for advanced callers (still public API). */
  getKernel() {
    return this.session.kernel;
  }

  getEventBus() {
    return this.session.eventBus;
  }

  private apply(result: KernelDispatchResult): KernelDispatchResult {
    this.lastResult = result;
    this.emit();
    return result;
  }

  addTextNode(text: string, name = "Text"): KernelDispatchResult {
    const doc = this.session.kernel.getDocument();
    const rootId = doc.tree.rootId;
    const node = createNodeFromDefaults("Text", name, rootId, {
      props: { text },
    });
    return this.apply(
      this.session.kernel.dispatch(new AddNodeCommand({ parentId: rootId, node })),
    );
  }

  updateNodeProp(nodeId: string, path: string, value: unknown): KernelDispatchResult {
    return this.apply(
      this.session.kernel.dispatch(
        new UpdatePropertyCommand({ nodeId, path, value }),
      ),
    );
  }

  removeNode(nodeId: string): KernelDispatchResult {
    return this.apply(
      this.session.kernel.dispatch(new RemoveNodeCommand({ nodeId })),
    );
  }

  undo(): KernelDispatchResult {
    return this.apply(this.session.kernel.undo());
  }

  redo(): KernelDispatchResult {
    return this.apply(this.session.kernel.redo());
  }

  clearEvents(): void {
    this.events = [];
    this.emit();
  }

  resetDocument(): void {
    this.session.kernel.loadDocument(
      createDefaultDocument({ title: "Playground Document" }),
    );
    this.lastResult = null;
    this.events = [];
    this.emit();
  }
}

export function createBuilderPlayground(): BuilderPlaygroundController {
  return new BuilderPlaygroundController();
}
