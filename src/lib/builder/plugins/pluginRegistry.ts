import type { CommandFactory } from "../commands/command.interface";
import type { CommandRegistry } from "../commands/commandManager";
import type { KernelEventBus } from "../kernel/eventBus";
import type { NodeRegistry } from "../registry/nodeRegistry";
import type { NodeDefinition } from "../registry/registry.types";
import {
  CORE_COMMAND_TYPES,
  type BuilderKernelFacade,
  type BuilderPlugin,
  type PluginCommandRegistryView,
  type PluginEventBusView,
  type PluginNodeRegistryView,
  type PluginPermission,
} from "./plugin.types";

const DEFAULT_PERMISSIONS: PluginPermission[] = [
  "nodes.register",
  "commands.register",
  "events.subscribe",
];

const CORE_COMMAND_SET = new Set<string>(CORE_COMMAND_TYPES);

export class PluginRegistry {
  private plugins = new Map<string, BuilderPlugin>();

  constructor(
    private readonly nodeRegistry: NodeRegistry,
    private readonly commandRegistry: CommandRegistry,
    private readonly eventBus: KernelEventBus,
  ) {}

  private permissionsFor(plugin: BuilderPlugin): Set<PluginPermission> {
    return new Set(plugin.permissions ?? DEFAULT_PERMISSIONS);
  }

  private createNodeView(): PluginNodeRegistryView {
    return {
      get: (type: string) => this.nodeRegistry.get(type),
      has: (type: string) => this.nodeRegistry.has(type),
      getAll: () => this.nodeRegistry.getAll(),
      isNativeType: (type: string) => this.nodeRegistry.isNativeType(type),
    };
  }

  private createCommandView(): PluginCommandRegistryView {
    return {
      has: (type: string) => this.commandRegistry.has(type),
      listTypes: () => this.commandRegistry.listTypes(),
    };
  }

  private createEventBusView(): PluginEventBusView {
    return {
      subscribe: (type, callback) => this.eventBus.subscribe(type, callback),
    };
  }

  private createFacade(plugin: BuilderPlugin): BuilderKernelFacade {
    const perms = this.permissionsFor(plugin);
    return {
      eventBus: this.createEventBusView(),
      nodeRegistry: this.createNodeView(),
      commandRegistry: this.createCommandView(),
      registerNode: (definition: NodeDefinition) => {
        if (!perms.has("nodes.register")) {
          throw new Error(`Plugin ${plugin.id} lacks permission nodes.register`);
        }
        const exists = this.nodeRegistry.has(definition.type);
        const isNative = this.nodeRegistry.isNativeType(definition.type);
        // Native core types require nodes.overwrite (CORE_NODE_WRITE).
        if (exists && isNative && !perms.has("nodes.overwrite")) {
          throw new Error(
            `Plugin ${plugin.id} cannot overwrite core/native node type ${definition.type} without nodes.overwrite`,
          );
        }
        const overwrite = exists && perms.has("nodes.overwrite");
        if (exists && !overwrite) {
          throw new Error(
            `Plugin ${plugin.id} cannot overwrite node type ${definition.type} without nodes.overwrite`,
          );
        }
        this.nodeRegistry.register(definition, { overwrite });
      },
      registerCommand: (type: string, factory: CommandFactory) => {
        if (!perms.has("commands.register")) {
          throw new Error(`Plugin ${plugin.id} lacks permission commands.register`);
        }
        // Core engine commands are never overwriteable by plugins.
        if (CORE_COMMAND_SET.has(type)) {
          throw new Error(
            `Plugin ${plugin.id} cannot register or overwrite core command type ${type}`,
          );
        }
        const exists = this.commandRegistry.has(type);
        const overwrite = exists && perms.has("commands.overwrite");
        if (exists && !overwrite) {
          throw new Error(
            `Plugin ${plugin.id} cannot overwrite command ${type} without commands.overwrite`,
          );
        }
        this.commandRegistry.register(type, factory, { overwrite });
      },
    };
  }

  register(plugin: BuilderPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    const facade = this.createFacade(plugin);
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
