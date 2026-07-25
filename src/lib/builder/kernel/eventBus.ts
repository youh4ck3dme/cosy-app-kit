export type KernelEventType =
  | "NODE_CREATED"
  | "NODE_UPDATED"
  | "NODE_DELETED"
  | "SELECTION_CHANGED"
  | "DOCUMENT_SAVED"
  | "DOCUMENT_LOADED"
  | "COMMAND_EXECUTED"
  | "COMMAND_UNDONE"
  | "COMMAND_REDONE"
  | "PLUGIN_REGISTERED";

export interface KernelEvent<TPayload = unknown> {
  type: KernelEventType;
  timestamp: number;
  payload: TPayload;
}

export type EventCallback<T = unknown> = (event: KernelEvent<T>) => void;

export class KernelEventBus {
  private listeners = new Map<KernelEventType, Set<EventCallback>>();

  subscribe<T>(type: KernelEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const targetSet = this.listeners.get(type)!;
    targetSet.add(callback as EventCallback);

    return () => {
      targetSet.delete(callback as EventCallback);
    };
  }

  emit<T>(type: KernelEventType, payload: T): void {
    const event: KernelEvent<T> = {
      type,
      timestamp: Date.now(),
      payload,
    };

    const targetSet = this.listeners.get(type);
    if (!targetSet) return;
    for (const callback of targetSet) {
      callback(event);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new KernelEventBus();
