# RFC-0001: Builder Runtime Foundation (v0.5.0)

- **Status:** Draft (Not yet implemented)
- **Related roadmap:** v0.5.0

## Problem

The Builder Kernel is a tested library but is not owned by a durable host session in the product. UI and persistence are absent.

## Proposal (direction only)

Introduce a runtime layer that:

- owns kernel lifecycle for a session
- defines host boundaries for document load/save (persistence mechanism TBD)
- prepares for a future Canvas consumer without embedding editor UI in the kernel

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

Undecided — draft only. No implementation implied.
