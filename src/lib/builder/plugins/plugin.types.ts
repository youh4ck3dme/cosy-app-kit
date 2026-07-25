import type { CommandFactory } from "../commands/command.interface";
import type { CommandRegistry } from "../commands/commandManager";
import type { KernelEventBus } from "../kernel/eventBus";
import type { NodeRegistry } from "../registry/nodeRegistry";
import type { NodeDefinition } from "../registry/registry.types";

export interface BuilderKernelFacade {
  registerNode(definition: NodeDefinition): void;
  registerCommand(type: string, factory: CommandFactory): void;
  eventBus: KernelEventBus;
  nodeRegistry: NodeRegistry;
  commandRegistry: CommandRegistry;
}

export interface BuilderPlugin {
  id: string;
  name: string;
  version: string;
  register(kernel: BuilderKernelFacade): void;
  nodes?: NodeDefinition[];
  onDestroy?(): void;
}
