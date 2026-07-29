# RFC-0001: Builder Runtime Foundation (v0.5.0)

- **Status:** Accepted direction (via [ADR-0005](../adr/ADR-0005-builder-runtime-foundation.md)); implementation **Not yet implemented**
- **Related roadmap:** v0.5.0
- **Related ADR:** [ADR-0005](../adr/ADR-0005-builder-runtime-foundation.md) is the binding decision (Accepted); this RFC remains the historical proposal

## Problem

The Builder Kernel is a tested library but is not owned by a durable host session in the product. UI and persistence are absent.

## Proposal (direction only)

Introduce a runtime layer that:

- owns kernel lifecycle for a session
- defines host boundaries for document load/save (persistence mechanism TBD)
- stays separate from Design Canvas; Canvas requires its own future ADR and milestone

## Alternatives

- Wire kernel calls directly from React components (rejected for now: blurs boundaries)
- Delay all integration until Canvas ships (risk: kernel drifts from product needs)

## Risks

- Premature persistence schema lock-in
- Accidental exposure of live kernel to plugins

## Open questions

- Persistence target (Supabase vs IndexedDB vs both)
- Whether Plugin SDK bridge lands in the same milestone

## Decision

**Accepted via [ADR-0005](../adr/ADR-0005-builder-runtime-foundation.md).** This RFC remains the historical proposal; ADR-0005 is the binding decision for scope, out-of-scope items, and suggested implementation slices. No Runtime implementation is implied by accepting the ADR alone — implementation remains Planned as v0.5.0.
