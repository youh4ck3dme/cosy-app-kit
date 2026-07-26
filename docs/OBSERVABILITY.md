# Observability

## Status

**Future milestone (v0.4.6 — Kernel Observatory).**

A diagnostics package may exist on disk under `src/lib/builder/diagnostics/` in some worktrees. As of the documentation inventory:

- It is **not** guaranteed to be committed on `main`.
- It is **not** exported from `src/lib/builder/index.ts`.
- There is **no** release tag `v0.4.6*`.

Do not document diagnostics APIs as shipped product surface until they are merged, exported, tested in CI, and tagged.

## Intended scope (when shipped)

Planned modules (from the Observatory milestone design):

| Module | Intent |
| --- | --- |
| `commandTelemetry` | Observe command outcomes without changing dispatch semantics |
| `performanceTracker` | Bounded timing metrics |
| `invariantReporter` | Structured invariant reports |
| `auditTrail` | Append-only bounded audit log |
| `kernelHealth` | Aggregate health snapshot |

Until merged, operators should rely on:

- Vitest unit suites
- CI (`typecheck`, `test:unit`, `build`)
- Prod smoke workflow on `main`

## Related

- [ROADMAP.md](./ROADMAP.md)
- [TESTING.md](./TESTING.md)
- [PERFORMANCE.md](./PERFORMANCE.md)
