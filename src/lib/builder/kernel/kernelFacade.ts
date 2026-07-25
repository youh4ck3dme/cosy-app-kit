import { globalCommandRegistry, type CommandRegistry } from "../commands/commandManager";
import { createDefaultDocument } from "../document/documentFactory";
import type { BuilderDocument } from "../document/document.types";
import type { HistoryView } from "../history/historyManager";
import { PluginRegistry } from "../plugins/pluginRegistry";
import { nativeNodeDefinitions } from "../registry/definitions/native";
import { NodeRegistry } from "../registry/nodeRegistry";
import { BuilderKernel, BuilderUiState } from "./builderKernel";
import { KernelEventBus } from "./eventBus";

export interface KernelBootstrapOptions {
  document?: BuilderDocument;
  registerNativeNodes?: boolean;
  eventBus?: KernelEventBus;
  nodeRegistry?: NodeRegistry;
  commandRegistry?: CommandRegistry;
}

export interface BootstrappedKernel {
  kernel: BuilderKernel;
  ui: BuilderUiState;
  eventBus: KernelEventBus;
  nodeRegistry: NodeRegistry;
  commandRegistry: CommandRegistry;
  pluginRegistry: PluginRegistry;
  history: HistoryView;
}

/** Wires registries, native node definitions, and a headless session. */
export function bootstrapBuilderKernel(
  options: KernelBootstrapOptions = {},
): BootstrappedKernel {
  const eventBus = options.eventBus ?? new KernelEventBus();
  const nodeRegistry = options.nodeRegistry ?? new NodeRegistry();
  const commandRegistry = options.commandRegistry ?? globalCommandRegistry;

  if (options.registerNativeNodes !== false) {
    for (const definition of nativeNodeDefinitions) {
      if (!nodeRegistry.has(definition.type)) {
        nodeRegistry.register(definition);
      }
    }
  }

  const document = options.document ?? createDefaultDocument();
  const kernel = new BuilderKernel(document, eventBus);
  const ui = new BuilderUiState(eventBus);
  const pluginRegistry = new PluginRegistry(nodeRegistry, commandRegistry, eventBus);

  return {
    kernel,
    ui,
    eventBus,
    nodeRegistry,
    commandRegistry,
    pluginRegistry,
    history: kernel.getHistory(),
  };
}

export { BuilderKernel, BuilderUiState };
