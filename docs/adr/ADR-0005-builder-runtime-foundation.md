# ADR-0005: Builder Runtime Foundation (v0.5.0)

- **Status:** Accepted (decision locked; implementation not yet shipped)
- **Date:** 2026-07
- **Related:** [RFC-0001](../rfc/RFC-0001-runtime-layer.md), [ADR-0001](./ADR-0001-builder-kernel.md), [ADR-0003](./ADR-0003-plugin-isolation.md)
- **Evidence:** Architecture review approved; decision is binding. No Runtime code shipped yet — implementation remains **Planned** as roadmap **v0.5.0** (Slice A+).

## Context

The Builder Kernel is a tested headless library (`src/lib/builder/`) with command history, invariants, and dual plugin foundations. Product UI still does not own a durable kernel session. [RFC-0001](../rfc/RFC-0001-runtime-layer.md) proposed a Runtime layer; it left persistence target and Plugin SDK bridging open.

Without an explicit host boundary, the next integrations (Canvas, persistence, plugins) risk wiring React components directly to a live kernel — reintroducing privilege and lifecycle hazards already rejected by ADR-0001 and ADR-0003.

## Decision

Introduce a **Builder Runtime** layer as the only long-lived host for a Builder Kernel session in product/engineering surfaces.

### What Runtime is

1. **Session owner** — creates, holds, and disposes a bootstrapped kernel for one editing/session lifetime.
2. **Boundary** — product surfaces talk to Runtime APIs (load/save hooks, readonly document views, command dispatch facades), not to private kernel internals.
3. **Host contracts** — defines interfaces for persistence and (later, under a separate bridge milestone) read-only Plugin SDK `documentSource` wiring; concrete backends stay TBD.

### Canvas boundary (explicit)

Runtime does not define Canvas APIs, RPC contracts, or plugin Canvas access.
Canvas integration requires a separate future ADR and implementation milestone.

### What Runtime is not (this milestone)

| Out of scope for v0.5.0 | Reason |
| --- | --- |
| Design Canvas iframe / PostMessage runtime | Separate roadmap item; RPC types only today; no Canvas surface under this ADR |
| Marketplace / third-party plugin install | Sequencing principle rejects marketplace-before-isolation completion |
| Mutation-rich Plugin SDK host (`document.write` / `document.modify`) | Declared inert; activating write is a later bridge milestone |
| Locked persistence schema (Supabase vs IndexedDB) | Premature lock-in called out in RFC-0001 |
| Unifying kernel `PluginRegistry` and `PluginSdkRegistry` permissions | Separate bridge work; not implied by Runtime session ownership |
| Replacing the product AI Builder chat/artifact canvas | Distinct product track |

### Hard constraints (carry forward)

- Do **not** hand plugins a live kernel, command manager, or writable registries (ADR-0003).
- Prefer `getReadonlyDocument()` / clones at trust boundaries; no silent aliasing of live document state.
- Do **not** execute untrusted generated plugin code on the authenticated app origin ([SECURITY.md](../SECURITY.md)).
- Kernel remains a library; Runtime is the host, not a second command engine.
- Do **not** add Canvas/RPC-shaped API surface under this ADR; any such surface requires its own future ADR before any slice may implement it.

### Suggested implementation slices (non-binding order)

| Slice | Intent |
| --- | --- |
| **A** | Session lifecycle + host facade over existing `bootstrapBuilderKernel` (create/dispose, readonly document, dispatch/undo/redo pass-through) |
| **B** | Persistence **ports** only (load/save interfaces + in-memory or test double); no production schema migration |
| **C** | Optional read-only Plugin SDK `documentSource` wiring behind an explicit flag/dev host — still no write permissions activated; no `canvasSource` |

Each slice should land as its own PR with tests. Slice C must not silently become a full SDK↔kernel permission unification. No slice may implement Canvas/RPC contracts.

## Alternatives considered

| Alternative | Outcome |
| --- | --- |
| Wire kernel calls directly from React components | Rejected — blurs boundaries; hard to enforce isolation |
| Delay all integration until Canvas ships | Rejected — kernel drifts from product needs; no session owner |
| Ship persistence schema + Runtime + Canvas in one milestone | Rejected — couples undecided storage to host lifecycle |

## Consequences

- Positive: single place to reason about kernel lifetime, disposal, and host permissions
- Positive: RFC-0001 open questions stay open without blocking Slice A
- Positive: Canvas / marketplace / write-bridge remain explicitly sequenced after Runtime foundations and their own ADRs
- Negative: dual plugin registries remain until a dedicated bridge ADR/milestone
- Negative: Accepted here means the **architecture decision** is locked — not that a `v0.5.0` Runtime tag has shipped

## Open questions (deferred, not blocking Slice A)

1. Persistence target: Supabase vs IndexedDB vs both
2. Whether any Plugin SDK host bridge shares the `v0.5.0` tag or a follow-up release
3. How Runtime sessions map onto authenticated product users / multi-tab

## Notes

Developer tooling (for example a `/dev` kernel playground) may exercise the kernel without being the product Runtime. Product Runtime remains the milestone described here.
