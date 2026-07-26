# ADR-0007: Design Canvas (kernel consumer) — Proposed

- **Status:** Proposed (not binding for implementation until Accepted)
- **Date:** 2026-07
- **Related:** [ADR-0001](./ADR-0001-builder-kernel.md), [ADR-0005](./ADR-0005-builder-runtime-foundation.md), [ADR-0006](./ADR-0006-kernel-observatory.md), canvas RPC types in `src/lib/builder/renderer/canvas/canvasRpc.types.ts`

## Context

Product Builder today previews **HTML artifacts** in a sandboxed iframe (`Canvas.tsx`). That surface is **not** a Design Canvas over `BuilderDocument`. RPC message types already exist for a future isolated canvas; Runtime Foundation explicitly excluded Canvas APIs.

Implementing Canvas before Observatory / Runtime boundaries would re-couple React UI to kernel internals.

## Decision (when Accepted)

1. Design Canvas is a **separate milestone** after v0.4.6 Observatory is shipped.
2. First MVP is **read-only render** of `BuilderDocument` inside `sandbox="allow-scripts"` **without** `allow-same-origin`, speaking PostMessage contracts from `canvasRpc.types.ts`.
3. Mutations go through Runtime / command dispatch — never direct document mutation from the iframe.
4. Product HTML artifact preview remains a parallel track (not replaced by Design Canvas in MVP).

## Non-goals (MVP)

- Figma parity, visual import adapters, CRDT multiplayer, marketplace plugins drawing into canvas
- Replacing chat→HTML artifact flow

## Open questions

- Exact message versioning / schema evolution
- How Runtime session maps 1:1 to a canvas iframe lifetime
- Whether playground embeds Design Canvas before product `/chat`

## Sequencing

```
Observatory (0006) → Accept this ADR → read-only Canvas MVP → write path under Runtime → plugin bridge → marketplace
```
