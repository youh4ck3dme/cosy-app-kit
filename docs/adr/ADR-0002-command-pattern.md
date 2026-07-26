# ADR-0002: Command pattern with undo/redo history

- **Status:** Accepted
- **Date:** 2026-07 (foundation + hardening tags)
- **Evidence:** `ICommand`, `BuilderKernel.dispatch`, `HistoryManager`, command implementations under `commands/impl/`

## Context

Document edits must be reversible, serializable, and fail closed. Ad-hoc mutations of a shared document object are unsafe.

## Decision

- All mutations go through `ICommand.execute` / `undo`
- Kernel snapshots before execute and restores on failure or invariant breach
- History stores serialized commands (with durable `inverse` where provided) and caps depth (default 100)
- Core types (`ADD_NODE`, `REMOVE_NODE`, `UPDATE_PROPERTY`, `MOVE_NODE`, `BATCH`) are reserved

## Alternatives considered

| Option                                         | Verdict    | Why                                                                                                                 |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Explicit `ICommand` + kernel `HistoryManager`  | **Chosen** | Fail-closed snapshot + invariants; serializable undo; no React coupling                                             |
| Direct in-place document mutation              | Rejected   | Partial failures leave corrupt graphs; no durable undo contract                                                     |
| Redux (or similar UI store) as source of truth | Rejected   | UI-centric store model; couples engine to React/subscriber patterns; poor fit for headless library + cold serialize |
| MobX (or similar observable object graph)      | Rejected   | Implicit mutation tracking; harder to seal trust boundaries and export deterministic history                        |

## Consequences

- Positive: undo/redo and audit-friendly serialization
- Positive: failed commands do not leave partial graph state
- Negative: every dispatch clones the document (memory cost O(n) per dispatch)
- Negative: custom commands must implement undo correctly
