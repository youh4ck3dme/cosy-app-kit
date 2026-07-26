import type { AuditEntry } from "./diagnostics.types";

const DEFAULT_MAX_ENTRIES = 500;

export interface AuditTrailOptions {
  readonly maxEntries?: number;
}

export interface AppendAuditInput {
  readonly action: string;
  readonly actor?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
  readonly id?: string;
}

/**
 * Append-only audit log with bounded storage and immutable returned records.
 */
export class AuditTrail {
  private readonly maxEntries: number;
  private readonly entries: AuditEntry[] = [];
  private seq = 0;

  constructor(options: AuditTrailOptions = {}) {
    this.maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  }

  append(input: AppendAuditInput): AuditEntry {
    const entry: AuditEntry = Object.freeze({
      id: input.id ?? this.nextId(),
      action: input.action,
      timestamp: input.timestamp ?? Date.now(),
      ...(input.actor !== undefined ? { actor: input.actor } : {}),
      ...(input.payload !== undefined
        ? { payload: Object.freeze({ ...input.payload }) }
        : {}),
    });
    this.entries.push(entry);
    while (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  /** Snapshot of all entries — each record is a frozen shallow clone. */
  getEntries(): readonly AuditEntry[] {
    return this.entries.map((entry) => this.cloneFrozen(entry));
  }

  getRecent(limit: number): readonly AuditEntry[] {
    const n = Math.max(0, limit);
    return this.entries.slice(-n).map((entry) => this.cloneFrozen(entry));
  }

  size(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries.length = 0;
  }

  private cloneFrozen(entry: AuditEntry): AuditEntry {
    return Object.freeze({
      ...entry,
      ...(entry.payload !== undefined
        ? { payload: Object.freeze({ ...entry.payload }) }
        : {}),
    });
  }

  private nextId(): string {
    this.seq += 1;
    return `audit_${this.seq}_${Date.now().toString(36)}`;
  }
}

export const globalAuditTrail = new AuditTrail();
