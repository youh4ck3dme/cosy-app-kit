# Observability

## Status

**Shipped as library APIs (v0.4.6 — Kernel Observatory Foundation).**

Diagnostics live under `src/lib/builder/diagnostics/` and are exported from `src/lib/builder/index.ts`. See [ADR-0006](./adr/ADR-0006-kernel-observatory.md) and [release notes](./releases/v0.4.6-kernel-observatory.md).

Opt-in only: hosts attach telemetry; kernel dispatch semantics are unchanged. Tag `v0.4.6-kernel-observatory` may be cut after merge when operators need a pinned release.

## Public modules

| Module | Intent |
| --- | --- |
| `commandTelemetry` | Observe command outcomes without changing dispatch semantics |
| `performanceTracker` | Bounded timing metrics |
| `invariantReporter` | Structured invariant reports |
| `auditTrail` | Append-only bounded audit log |
| `kernelHealth` | Aggregate health snapshot |

Operators should also rely on:

- Vitest unit suites (`src/lib/builder/diagnostics/diagnostics.test.ts`)
- CI (`typecheck`, `test:unit`, `build`)
- Prod smoke workflow on `main`

## Related

- [ADR-0006](./adr/ADR-0006-kernel-observatory.md)
- [ROADMAP.md](./ROADMAP.md)
- [TESTING.md](./TESTING.md)
- [PERFORMANCE.md](./PERFORMANCE.md)
