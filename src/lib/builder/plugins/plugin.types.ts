import type { CommandFactory } from "../commands/command.interface";
import type { EventCallback, KernelEventType } from "../kernel/eventBus";
import type { NodeDefinition } from "../registry/registry.types";

export type PluginPermission =
  | "nodes.register"
  | "nodes.overwrite"
  | "commands.register"
  | "commands.overwrite"
  | "events.subscribe"
  | "document.read"
  | "document.write";

/**
 * Core command types that marketplace plugins may never overwrite,
 * even with commands.overwrite. New custom types only.
 */
export const CORE_COMMAND_TYPES = [
  "ADD_NODE",
  "REMOVE_NODE",
  "UPDATE_PROPERTY",
  "MOVE_NODE",
  "BATCH",
] as const;

export type CoreCommandType = (typeof CORE_COMMAND_TYPES)[number];

/** Read-only node registry surface for plugins (no register/clear). */
export interface PluginNodeRegistryView {
  get(type: string): NodeDefinition | undefined;
  has(type: string): boolean;
  getAll(): NodeDefinition[];
  isNativeType(type: string): boolean;
}

/** Read-only command registry surface for plugins (no register). */
export interface PluginCommandRegistryView {
  has(type: string): boolean;
  listTypes(): string[];
}

/** Subscribe-only kernel event surface for plugins (no emit/clear — cannot forge or wipe kernel events). */
export interface PluginEventBusView {
  subscribe<T>(type: KernelEventType, callback: EventCallback<T>): () => void;
}

/**
 * Permission-gated kernel surface for plugins.
 * Live NodeRegistry / CommandRegistry / KernelEventBus are intentionally not exposed.
 */
export interface BuilderKernelFacade {
  registerNode(definition: NodeDefinition): void;
  registerCommand(type: string, factory: CommandFactory): void;
  /** Subscribe-only view — plugins cannot emit or clear kernel events. */
  eventBus: PluginEventBusView;
  /** Read-only view — mutations must go through registerNode. */
  nodeRegistry: PluginNodeRegistryView;
  /** Read-only view — mutations must go through registerCommand. */
  commandRegistry: PluginCommandRegistryView;
}

export interface BuilderPlugin {
  id: string;
  name: string;
  version: string;
  /**
   * Declared capabilities — defaults to register-only (no overwrite).
   * CORE_NODE_WRITE equivalent is nodes.overwrite (opt-in, still blocked for escape).
   * COMMAND_REGISTER is restricted: custom types only; core commands never overwriteable.
   */
  permissions?: PluginPermission[];
  register(kernel: BuilderKernelFacade): void;
  nodes?: NodeDefinition[];
  onDestroy?(): void;
}
