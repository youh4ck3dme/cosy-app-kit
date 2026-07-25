import type { NodeDefinition } from "./registry.types";

export class NodeRegistry {
  private definitions = new Map<string, NodeDefinition>();

  register(definition: NodeDefinition): void {
    if (this.definitions.has(definition.type)) {
      console.warn(`Overwriting node definition for type: ${definition.type}`);
    }
    this.definitions.set(definition.type, definition);
  }

  get(type: string): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  clear(): void {
    this.definitions.clear();
  }
}

export const globalNodeRegistry = new NodeRegistry();
