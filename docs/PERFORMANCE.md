# Performance

## Measured today

There is **no** committed microbenchmark suite or published performance dashboard for the Builder Kernel. Claims below are architectural expectations from the implementation, plus test-suite timing as a coarse signal.

Vitest runs (local engineering signal, not a formal SLA):

- Builder unit suites typically complete in well under a few seconds on a developer machine.
- Full `bun run test:unit` has been observed around ~2s for the current suite size (~280+ tests depending on branch contents).

Do not treat those timings as contractual performance guarantees.

## Architecture complexity (expected)

| Operation                         | Expected complexity             | Notes                                    |
| --------------------------------- | ------------------------------- | ---------------------------------------- |
| Command execute (local tree edit) | Typically O(k) in touched nodes | Depends on command                       |
| `validateDocument`                | O(n) nodes                      | Includes cycle walk over parent pointers |
| `cloneDocument` on dispatch       | O(n)                            | Snapshot per dispatch                    |
| History push                      | O(1) amortized                  | Evicts beyond max entries                |
| Undo / redo                       | Cost of inverse command         | Plus validation paths as implemented     |

## Memory considerations

- Each `dispatch` clones the document for snapshotting — memory scales with document size × concurrent snapshots (usually one).
- History retains up to **100** entries by default (`BuilderKernel` → `HistoryManager(100)`), each holding serialized command material and a live command instance.
- Plugin SDK registries retain manifests + handlers only (small).

## Undo stack

- Bounded (`maxHistoryEntries`).
- Oldest entries drop when capacity exceeded.
- Serialized event log export available via `HistoryView.exportEventLog()`.

## Future optimization points (Planned)

| Idea                                                          | Status              |
| ------------------------------------------------------------- | ------------------- |
| Structural sharing / persistent data structures for snapshots | Not yet implemented |
| Incremental invariant checks                                  | Not yet implemented |
| Worker-thread validation for large documents                  | Not yet implemented |
| Formal benchmark harness + CI budgets                         | Not yet implemented |
| Observatory performance metrics (v0.4.6)                      | Future milestone    |

## Performance goals (targets, not measurements)

| Goal                          | Target                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- |
| Unit suite (full)             | Stay fast enough for PR CI (< ~1–2 min wall including install/build today) |
| Single dispatch on small docs | Interactive (< 16ms ideal) — **not yet benchmarked in CI**                 |
| Large document validation     | Linear; avoid accidental O(n²) parent walks — cycle walk is O(n)           |

## Product Builder — Performance Contract v0.1

Product chat + canvas budgets, dual-brain boundaries, stream trim, and CSP guardrails live in **[PERFORMANCE_CONTRACT.md](./PERFORMANCE_CONTRACT.md)** (`src/lib/performance-contract.ts`). Marketplace / CRDT remain out of scope.

## Related

- [PERFORMANCE_CONTRACT.md](./PERFORMANCE_CONTRACT.md)
- [OBSERVABILITY.md](./OBSERVABILITY.md)
- [UNDO_REDO.md](./UNDO_REDO.md)
- [TESTING.md](./TESTING.md)
