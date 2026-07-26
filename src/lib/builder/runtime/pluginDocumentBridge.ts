/**
 * Builder Runtime — ADR-0005 Slice C.
 *
 * Optional read-only Plugin SDK `documentSource` wiring behind an explicit
 * enable flag. Does NOT:
 * - hand plugins a live kernel / command manager / writable registries
 * - activate document.write / document.modify (SDK context has no write API)
 * - wire `canvasSource` (requires a future Canvas ADR)
 * - unify PluginSdkRegistry with kernel PluginRegistry
 */

import type { PluginDocumentSource } from "@/lib/plugin-sdk";
import { PluginSdkRegistry } from "@/lib/plugin-sdk";

import type { BuilderRuntime } from "./builderRuntime";

/**
 * Read-only document accessor for Plugin SDK hosts.
 * Each `read()` returns a fresh frozen clone via Runtime's public facade.
 */
export function createReadonlyPluginDocumentSource(runtime: BuilderRuntime): PluginDocumentSource {
  return {
    read() {
      if (runtime.disposed) {
        throw new Error("BuilderRuntime session is disposed.");
      }
      return runtime.getReadonlyDocument();
    },
  };
}

export type CreateDevPluginSdkHostOptions = {
  runtime: BuilderRuntime;
  /**
   * Explicit opt-in (ADR-0005 Slice C). Must be `true` — omitting or passing
   * `false` throws so silent wiring cannot happen.
   */
  enablePluginDocumentSource: true;
};

/**
 * Dev / flag-gated Plugin SDK host bound to a Runtime session.
 * Supplies documentSource only — never canvasSource.
 */
export function createDevPluginSdkHost(options: CreateDevPluginSdkHostOptions): PluginSdkRegistry {
  if (options.enablePluginDocumentSource !== true) {
    throw new Error(
      "createDevPluginSdkHost requires enablePluginDocumentSource: true (ADR-0005 Slice C).",
    );
  }
  if (options.runtime.disposed) {
    throw new Error("BuilderRuntime session is disposed.");
  }
  return new PluginSdkRegistry({
    documentSource: createReadonlyPluginDocumentSource(options.runtime),
  });
}
