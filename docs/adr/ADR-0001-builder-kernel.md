# ADR-0001: Headless Builder Kernel as a library

- **Status:** Accepted
- **Date:** 2026-07 (tag lineage `v0.4.5*`)
- **Evidence:** `src/lib/builder/`, `bootstrapBuilderKernel`, no product route imports of `@/lib/builder`

## Context

The product already had a chat + artifact preview UI. A design-document engine was required that could be hardened and tested independently of React routes and the artifact iframe.

## Decision

Ship the Builder Kernel as a **headless TypeScript library** under `src/lib/builder/`:

- owns `BuilderDocument` + history
- exposes commands via `dispatch`
- does not render UI
- Canvas consumer remains a later milestone (RPC types only today)

## Consequences

- Positive: unit-testable engine; hardening possible without UI churn
- Positive: clear boundary between product artifact canvas and future design Canvas
- Negative: product does not yet benefit from the kernel until a runtime/UI bridge ships (Planned: v0.5.0+)
