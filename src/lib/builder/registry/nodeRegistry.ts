import type { NodeDefinition } from "./registry.types";

const NATIVE_TYPES = new Set(["Container", "Section", "Text", "Button", "Image"]);

export class NodeRegistry {
  private definitions = new Map<string, NodeDefinition>();

  register(definition: NodeDefinition, options?: { overwrite?: boolean }): void {
    const exists = this.definitions.has(definition.type);
    if (exists) {
      const isNative = NATIVE_TYPES.has(definition.type);
      if (!options?.overwrite) {
        throw new Error(
          `Node type already registered: ${definition.type}${isNative ? " (native)" : ""}`,
        );
      }
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

  isNativeType(type: string): boolean {
    return NATIVE_TYPES.has(type);
  }

  clear(): void {
    this.definitions.clear();
  }
}

export const globalNodeRegistry = new NodeRegistry();
