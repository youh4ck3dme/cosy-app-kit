/**
 * Builder Runtime — ADR-0005 Slice A.
 *
 * Sole long-lived host for a Builder Kernel session. Product / engineering
 * surfaces talk to this facade only — never to live kernel, command manager,
 * or writable registries (ADR-0001, ADR-0003).
 *
 * Out of scope here: persistence ports (Slice B), Plugin SDK bridges (Slice C),
 * Canvas / PostMessage / RPC.
 */

import type { ICommand } from "../commands/command.interface";
import type { BuilderDocument } from "../document/document.types";
import type { KernelDispatchResult } from "../kernel/builderKernel";
import {
  bootstrapBuilderKernel,
  type BootstrappedKernel,
  type KernelBootstrapOptions,
} from "../kernel/kernelFacade";

export type BuilderRuntimeOptions = KernelBootstrapOptions;

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
   * Release session resources. Idempotent — safe to call more than once.
   * Does not expose or return the underlying kernel.
   */
  dispose(): void;
}

class BuilderRuntimeSession implements BuilderRuntime {
  readonly id: string;
  #session: BootstrappedKernel | null;
  #disposed = false;

  constructor(options: BuilderRuntimeOptions = {}) {
    this.id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    // Own the bootstrapped session privately — never assign to public fields.
    this.#session = bootstrapBuilderKernel(options);
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

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    // Drop the only reference to kernel / registries / event bus.
    this.#session = null;
  }
}

/** Create a Runtime-owned kernel session (ADR-0005 Slice A). */
export function createBuilderRuntime(
  options: BuilderRuntimeOptions = {},
): BuilderRuntime {
  return new BuilderRuntimeSession(options);
}
