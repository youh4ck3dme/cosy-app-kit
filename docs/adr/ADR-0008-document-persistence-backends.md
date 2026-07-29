# ADR-0008: Document persistence backends (behind Runtime ports)

- **Status:** Proposed — ready for owner Accept (not binding for implementation until Accepted)
- **Date:** 2026-07
- **Related:** [ADR-0005](./ADR-0005-builder-runtime-foundation.md), [ADR-0007](./ADR-0007-design-canvas.md), [RFC-0001](../rfc/RFC-0001-runtime-layer.md), `src/lib/builder/runtime/persistence.ts`, `src/lib/builder/runtime/persistence.test.ts`, `docs/product/migrations.md`, `docs/product/architecture.md` (RLS on `threads/messages/artifacts/thread_memory`)

## Context

Slice B ([ADR-0005](./ADR-0005-builder-runtime-foundation.md)) shipped **ports only**: `RuntimePersistence` (`load(): Promise<BuilderDocument | null>`, `save(document): Promise<void>`) plus `InMemoryRuntimePersistence`, which clones on both save and load so the store never aliases live document state in either direction. `BuilderRuntime.loadFromStore()`/`saveToStore()` already handle the disposal race (a session disposed mid-`load()` throws instead of silently resurrecting) and are covered by `builderRuntime.persistence.test.ts`.

No production backend exists. RFC-0001/ADR-0005 left the concrete storage target open on purpose, and there is still no product use-case that actually needs a durable `BuilderDocument` — the shipped Supabase `artifacts` table stores chat-generated HTML/JS/CSS files, not kernel node graphs, and `artifact_versions` (`docs/product/migrations.md`) versions that same HTML, not `BuilderDocument`. Conflating the two would silently violate ADR-0005's own non-goal ("Using artifact HTML rows as `BuilderDocument` persistence").

This ADR does not lock a backend choice — that stays explicitly deferred (see Open questions) — but it does lock the **process and interface constraints** any future backend must follow, so a Slice D implementation PR has an unambiguous bar to build against.

## Decision

### 1. One backend at a time

The first production backend PR (Slice D) implements **exactly one** of IndexedDB or Supabase — never both in the same PR. Whichever ships first is chosen when a real product use-case needs a durable `BuilderDocument` (not before, and not speculatively).

### 2. Interface stays exactly `RuntimePersistence`

Slice D's backend implements `load()`/`save()` as they exist today — no interface expansion (no `subscribe()`, no migration hooks, no conflict-resolution API) in the first production PR. Any such capability is a separate future ADR. This keeps the Runtime facade's public surface (`BuilderRuntime` in `builderRuntime.ts`) unchanged; product code still only ever talks to `BuilderRuntime`, never to the backend directly.

### 3. No schema until a backend is chosen; no migration without its own ADR/RFC

Schema design (tables, IndexedDB object stores/indexes) is out of scope for this ADR and is **not** decided here. Once a backend is chosen for Slice D, its schema and any migration plan requires its own follow-up ADR/RFC before shipping — mirroring how `artifact_versions` got its own migration doc rather than being folded into an unrelated PR.

### 4. No autosave-on-every-dispatch in Slice D

Slice D calls `saveToStore()` only when explicitly invoked by the host (e.g. a "Save" action), matching how the existing product artifact-save flow already works (explicit save, not autosave-per-keystroke). Autosave/debounced-save cadence is a product decision for a later ADR, not assumed here — this avoids Slice D silently becoming a performance-sensitive background-sync feature.

### 5. Host surface: playground first, same reasoning as ADR-0007

The first backend gets wired into `/dev/builder-playground` (dev-only, `import.meta.env.DEV`-gated, zero prod exposure) before any product `/chat` wiring — the same sequencing logic [ADR-0007](./ADR-0007-design-canvas.md) already uses for Design Canvas, kept consistent across both ADRs rather than inventing a different rollout path here.

### 6. Security separation from `artifacts`

If Supabase is the eventual choice, any `BuilderDocument` table is a **new, dedicated table with its own RLS policy** — never a reuse or extension of the existing `artifacts`/`artifact_versions` RLS (`docs/product/architecture.md`: RLS today covers `threads/messages/artifacts/thread_memory`, none of which model a kernel document). If IndexedDB is the eventual choice, storage is inherently origin-scoped by the browser; no additional cross-origin sharing mechanism is introduced by this ADR.

## Non-goals

- Locking IndexedDB vs Supabase as the chosen backend (explicitly deferred — see Open questions)
- CRDT multiplayer storage or any multi-writer conflict resolution
- Using artifact HTML rows (`artifacts`/`artifact_versions`) as `BuilderDocument` persistence
- Schema/migration design — requires its own follow-up ADR/RFC once a backend is chosen
- Autosave-on-every-dispatch or any background sync cadence
- Implementing both backends simultaneously "to be safe"

## Success metrics (Slice D, whenever it ships)

- The chosen backend passes the existing `persistence.test.ts` contract suite (round-trip via save→load, clone-on-save, clone-on-load, later-save-overwrites) **unmodified** — only a new implementation class is added under test, proving the port contract didn't have to change to fit the backend.
- `builderRuntime.persistence.test.ts`'s disposal-race and no-persistence-configured tests keep passing unchanged against the new backend wired through `BuilderRuntime`.
- Zero `BuilderDocument` data appears in the `artifacts` or `artifact_versions` tables at any point.
- Playground wiring (§5) works end-to-end (save, reload page, load) before any product `/chat` follow-up is proposed.

## Open questions

**Must decide before Accept** (owner sign-off needed):

1. **SSR viability**: this is a TanStack Start app — does a `BuilderRuntime` session (and therefore its persistence calls) ever need to exist server-side (e.g. during SSR or inside a `serverFn`), or is it strictly client-only? This matters architecturally: IndexedDB is browser-only, so if server-side Runtime sessions are ever needed, IndexedDB alone cannot be the answer and Supabase (or a server-reachable store) becomes required rather than optional.
2. Whether backend selection criteria should be written down now (e.g. "single-user local-first editing → IndexedDB; cross-device/synced documents → Supabase") even though no concrete use-case exists yet, versus leaving the criteria themselves undecided until a use-case forces the question.
3. If Supabase is later chosen: who owns writing the dedicated RLS policy review (§6) — same reviewer/process as existing `artifacts` RLS, or a separate security sign-off given it's a new data model.

**Defer to implementation PR** (does not block Accept):

1. Exact IndexedDB object-store/index shape or exact Supabase table/column shape — both depend on the schema ADR/RFC required by §3, not this ADR.
2. Debounce/save-cadence tuning if a later ADR ever approves autosave.
3. Whether the playground gets a visible "Save/Load" UI affordance or exercises persistence purely through dev-console calls first.

## Sequencing

```
Observatory (0006, shipped) + Design Canvas ADR (0007) → Accept this ADR → choose one backend (Slice D) → playground wiring → schema/migration ADR → product wiring (separate future ADR)
```
