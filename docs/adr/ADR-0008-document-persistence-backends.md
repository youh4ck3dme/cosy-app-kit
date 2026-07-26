# ADR-0008: Document persistence backends (behind Runtime ports) — Proposed

- **Status:** Proposed
- **Date:** 2026-07
- **Related:** [ADR-0005](./ADR-0005-builder-runtime-foundation.md), Runtime `RuntimePersistence` in `src/lib/builder/runtime/persistence.ts`

## Context

Slice B shipped **ports** (`RuntimePersistence`, `loadFromStore` / `saveToStore`) with an in-memory double. ADR-0005 left Supabase vs IndexedDB schema unlocked on purpose.

## Decision (when Accepted)

1. Persistence backends plug in **only** via `RuntimePersistence` — no parallel ORMs or ad-hoc storage in React.
2. First production backend choice is deferred until one product use-case needs durable kernel documents (not HTML artifacts in Supabase `artifacts` table).
3. Candidates: IndexedDB (local-first editing) and/or Supabase (synced documents) — pick one for Slice D; do not implement both in the first backend PR.
4. Schema migrations require an explicit follow-up ADR/RFC once the first backend is chosen.

## Non-goals

- CRDT multiplayer storage
- Using artifact HTML rows as `BuilderDocument` persistence

## Sequencing

After Design Canvas ADR acceptance and Observatory on `main`; before marketplace.
