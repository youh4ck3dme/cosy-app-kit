# ADR-0004: Document invariants after every successful mutation

- **Status:** Accepted
- **Date:** 2026-07 (hardening `v0.4.5.1-hardening`)
- **Evidence:** `validateDocument` in `document/documentInvariants.ts`; called from `BuilderKernel.dispatch` after execute

## Context

Zod validates shape, not graph integrity (orphans, cycles, parent/child asymmetry). Hardening audits required refuse-closed integrity.

## Decision

- After a successful `command.execute`, run `validateDocument`
- On failure: restore snapshot, return error, do not push history
- Expose `validateDocument` / `assertValidDocument` for tests and tooling

## Consequences

- Positive: corrupt graphs are rejected at the kernel boundary
- Positive: issue codes are explicit and testable
- Negative: full-document validation cost on each successful dispatch (O(n))
