/**
 * Builder Runtime — ADR-0005 Slice B.
 *
 * Persistence PORTS only. No production backend, no schema, no migrations —
 * the concrete target (Supabase vs IndexedDB vs both) remains an explicit
 * open question in RFC-0001 / ADR-0005. This file defines the load/save
 * contract a Runtime session can optionally use, plus an in-memory
 * implementation for tests and local/dev use.
 */

import { cloneDocument } from "../document/cloneDocument";
import type { BuilderDocument } from "../document/document.types";

export interface RuntimePersistence {
  /** Returns the stored document, or null if nothing has been saved yet. */
  load(): Promise<BuilderDocument | null>;
  /** Persists a snapshot of the given document. */
  save(document: BuilderDocument): Promise<void>;
}

/**
 * In-memory persistence port — default test double, not a production backend.
 * Clones on both save and load so the store never aliases live document
 * state in either direction (ADR-0005 hard constraint).
 */
export class InMemoryRuntimePersistence implements RuntimePersistence {
  #stored: BuilderDocument | null = null;

  async load(): Promise<BuilderDocument | null> {
    return this.#stored ? cloneDocument(this.#stored) : null;
  }

  async save(document: BuilderDocument): Promise<void> {
    this.#stored = cloneDocument(document);
  }
}
