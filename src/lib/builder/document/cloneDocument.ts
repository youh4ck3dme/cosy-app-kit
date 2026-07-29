import type { BuilderDocument, BuilderNode } from "./document.types";

/** Thrown when a document/value cannot survive a structured-clone snapshot. */
export class KernelCloneError extends Error {
  constructor(cause: unknown) {
    super(`Kernel snapshot failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "KernelCloneError";
  }
}

export function cloneDocument(document: BuilderDocument): BuilderDocument {
  try {
    return structuredClone(document);
  } catch (error) {
    throw new KernelCloneError(error);
  }
}

export function cloneNode<T extends BuilderNode>(node: T): T {
  try {
    return structuredClone(node);
  } catch (error) {
    throw new KernelCloneError(error);
  }
}

/** True if `value` can survive a structured-clone round trip (rejects functions, symbols, etc.). */
export function isCloneable(value: unknown): boolean {
  if (value === undefined) return true;
  try {
    structuredClone(value);
    return true;
  } catch {
    return false;
  }
}

/** Deep-freeze a value for readonly external boundaries (dev / sealed APIs). */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  const obj = value as object;
  if (Object.isFrozen(obj)) {
    return value;
  }

  Object.freeze(obj);

  for (const key of Reflect.ownKeys(obj)) {
    const child = (obj as Record<string | symbol, unknown>)[key as string];
    if (child !== null && typeof child === "object") {
      deepFreeze(child);
    }
  }

  return value;
}
