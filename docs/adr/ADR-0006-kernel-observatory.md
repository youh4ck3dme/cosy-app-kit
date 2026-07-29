# ADR-0006: Kernel Observatory Foundation (v0.4.6)

- **Status:** Accepted
- **Date:** 2026-07
- **Related:** [ADR-0001](./ADR-0001-builder-kernel.md), [ADR-0004](./ADR-0004-document-invariants.md), [OBSERVABILITY.md](../OBSERVABILITY.md)

## Context

After kernel foundation, hardening, Plugin SDK, and Runtime slices A–C, operators still lack a first-class, exported diagnostics surface. Diagnostics modules already existed under `src/lib/builder/diagnostics/` but were untracked / unexported — invisible to CI consumers and the public builder barrel.

Sequencing requires **observability before** Design Canvas / Marketplace / mutation-rich hosts.

## Decision

Ship **Kernel Observatory Foundation** as library APIs only:

1. Commit `src/lib/builder/diagnostics/**` and export selected types + constructors from `src/lib/builder/index.ts`.
2. Keep diagnostics **opt-in** — no automatic wiring into every `BuilderKernel` dispatch in this milestone (hosts attach telemetry when ready).
3. Non-goals: Design Canvas host UI, marketplace telemetry, PII-bearing remote analytics, CRDT sync metrics.

### Public surface (v0.4.6)

| Export                                             | Role                          |
| -------------------------------------------------- | ----------------------------- |
| `CommandTelemetry` / `globalCommandTelemetry`      | Bounded command outcome log   |
| `PerformanceTracker` / `globalPerformanceTracker`  | Named timing metrics          |
| `InvariantReporter` / `globalInvariantReporter`    | Structured invariant reports  |
| `AuditTrail` / `globalAuditTrail`                  | Append-only audit ring buffer |
| `getKernelHealth` / plugin health snapshot helpers | Aggregated health report      |

## Consequences

- Playground / Runtime hosts may subscribe without forking private paths.
- Tag `v0.4.6-kernel-observatory` may be cut after merge when release notes are published.
- Design Canvas and Marketplace remain blocked until this foundation is on `main`.

## Evidence

- Unit suite: `src/lib/builder/diagnostics/diagnostics.test.ts`
- Barrel export: `src/lib/builder/index.ts`
