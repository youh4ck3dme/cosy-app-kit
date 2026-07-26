/**
 * Builder Runtime — ADR-0005 Slice A + Slice B (persistence ports).
 *
 * Sole long-lived host for a Builder Kernel session. Product / engineering
 * surfaces talk to this facade only — never to live kernel, command manager,
 * or writable registries (ADR-0001, ADR-0003).
 *
 * Slice B adds an optional persistence port (load/save). No production
 * backend, no schema, no migrations — see persistence.ts.
 *
 * Out of scope here: Plugin SDK bridges (Slice C), Canvas / PostMessage / RPC.
 */

import type { ICommand } from "../commands/command.interface";
import type { BuilderDocument } from "../document/document.types";
import type { KernelDispatchResult } from "../kernel/builderKernel";
import {
  bootstrapBuilderKernel,
  type BootstrappedKernel,
  type KernelBootstrapOptions,
} from "../kernel/kernelFacade";
import type { RuntimePersistence } from "./persistence";

export interface BuilderRuntimeOptions extends KernelBootstrapOptions {
  /** Optional persistence port (Slice B). No production backend implied. */
  persistence?: RuntimePersistence;
}

export interface BuilderRuntime {
  /** Opaque session id for diagnostics / logging (not a security boundary). */
  readonly id: string;
  /** True after dispose(); further mutations throw. */
  readonly disposed: boolean;
  getReadonlyDocument(): BuilderDocument;
  dispatch(command: ICommand): KernelDispatchResult;
  undo(): KernelDispatchResult;
  redo(): KernelDispatchResult;
  canUndo(): boolean;
  canRedo(): boolean;
  /**
   * Replace the current document with whatever the configured persistence
   * port returns. Resolves `false` (no-op, current document kept) when the
   * store has nothing saved yet. Throws if no persistence port was
   * configured, or if the session is/becomes disposed.
   */
  loadFromStore(): Promise<boolean>;
  /**
   * Persist the current readonly document snapshot via the configured
   * persistence port. Throws if no persistence port was configured.
   */
  saveToStore(): Promise<void>;
  /**
   * Release session resources. Idempotent — safe to call more than once.
   * Does not expose or return the underlying kernel.
   */
  dispose(): void;
}

class BuilderRuntimeSession implements BuilderRuntime {
  readonly id: string;
  #session: BootstrappedKernel | null;
  #disposed = false;
  #persistence: RuntimePersistence | null;

  constructor(options: BuilderRuntimeOptions = {}) {
    this.id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    // Own the bootstrapped session privately — never assign to public fields.
    this.#session = bootstrapBuilderKernel(options);
    this.#persistence = options.persistence ?? null;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  private requireSession(): BootstrappedKernel {
    if (this.#disposed || !this.#session) {
      throw new Error("BuilderRuntime session is disposed.");
    }
    return this.#session;
  }

  getReadonlyDocument(): BuilderDocument {
    // Kernel already returns a deep-cloned, deep-frozen document.
    return this.requireSession().kernel.getReadonlyDocument();
  }

  dispatch(command: ICommand): KernelDispatchResult {
    return this.requireSession().kernel.dispatch(command);
  }

  undo(): KernelDispatchResult {
    return this.requireSession().kernel.undo();
  }

  redo(): KernelDispatchResult {
    return this.requireSession().kernel.redo();
  }

  canUndo(): boolean {
    return this.requireSession().kernel.getHistory().canUndo();
  }

  canRedo(): boolean {
    return this.requireSession().kernel.getHistory().canRedo();
  }

  async loadFromStore(): Promise<boolean> {
    const session = this.requireSession();
    const persistence = this.#persistence;
    if (!persistence) {
      throw new Error("No persistence configured for this Runtime session.");
    }
    const doc = await persistence.load();
    if (!doc) return false;
    // Re-check after the async gap: dispose() may have run while load() was
    // in flight. A disposed session must not be silently resurrected.
    if (this.#disposed) {
      throw new Error("BuilderRuntime session is disposed.");
    }
    session.kernel.loadDocument(doc);
    return true;
  }

  async saveToStore(): Promise<void> {
    const session = this.requireSession();
    if (!this.#persistence) {
      throw new Error("No persistence configured for this Runtime session.");
    }
    // Already a deep-cloned, deep-frozen snapshot — safe to hand to the port.
    await this.#persistence.save(session.kernel.getReadonlyDocument());
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    // Drop the only reference to kernel / registries / event bus.
    this.#session = null;
    this.#persistence = null;
  }
}

/** Create a Runtime-owned kernel session (ADR-0005 Slice A). */
export function createBuilderRuntime(
  options: BuilderRuntimeOptions = {},
): BuilderRuntime {
  return new BuilderRuntimeSession(options);
}
