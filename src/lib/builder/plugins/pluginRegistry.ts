import type { CommandFactory } from "../commands/command.interface";
import type { CommandRegistry } from "../commands/commandManager";
import type { KernelEventBus } from "../kernel/eventBus";
import type { NodeRegistry } from "../registry/nodeRegistry";
import type { NodeDefinition } from "../registry/registry.types";
import type { BuilderKernelFacade, BuilderPlugin } from "./plugin.types";

export class PluginRegistry {
  private plugins = new Map<string, BuilderPlugin>();

  constructor(
    private readonly nodeRegistry: NodeRegistry,
    private readonly commandRegistry: CommandRegistry,
    private readonly eventBus: KernelEventBus,
  ) {}

  private createFacade(): BuilderKernelFacade {
    return {
      eventBus: this.eventBus,
      nodeRegistry: this.nodeRegistry,
      commandRegistry: this.commandRegistry,
      registerNode: (definition: NodeDefinition) => {
        this.nodeRegistry.register(definition);
      },
      registerCommand: (type: string, factory: CommandFactory) => {
        this.commandRegistry.register(type, factory);
      },
    };
  }

  register(plugin: BuilderPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    const facade = this.createFacade();
    if (plugin.nodes) {
      for (const definition of plugin.nodes) {
        facade.registerNode(definition);
      }
    }
    plugin.register(facade);
    this.plugins.set(plugin.id, plugin);
    this.eventBus.emit("PLUGIN_REGISTERED", {
      pluginId: plugin.id,
      name: plugin.name,
      version: plugin.version,
    });
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    plugin.onDestroy?.();
    this.plugins.delete(pluginId);
  }

  get(pluginId: string): BuilderPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  list(): BuilderPlugin[] {
    return Array.from(this.plugins.values());
  }
}
