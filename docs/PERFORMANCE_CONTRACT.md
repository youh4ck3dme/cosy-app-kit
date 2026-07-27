# Performance Contract v0.1

**Status:** Active · **Scope:** Product Builder (TanStack chat + live artifact canvas)  
**Out of scope:** Marketplace, CRDT multiplayer, Design Canvas host implementation

This contract is the shipping bar for **time-to-first-artifact**. Kernel micro-benchmarks remain in [PERFORMANCE.md](./PERFORMANCE.md).

## Dual-brain rule

| Brain | Path | Product chat may… |
| --- | --- | --- |
| Product app | `src/routes/_authenticated/chat*`, `src/components/app-shell/*` | Import preview/canvas only via **lazy** boundaries |
| Builder Kernel | `src/lib/builder/**`, `/dev/builder-playground` | **Not** load on `/chat` critical path |

Violations (eager kernel/playground/Monaco on chat first paint) are P0.

## Budgets (targets)

| Metric | Budget | How to think about it |
| --- | --- | --- |
| LCP (`/chat` shell) | ≤ 2500 ms | Composer + thread list usable |
| INP (send / Chat↔Preview) | ≤ 200 ms | No main-thread Monaco/analysis spikes |
| Artifact first paint | ≤ 800 ms | HTML ready → iframe `onLoad` |
| Chat TTFB | ≤ 1500 ms | Auth + trim + model start |
| Context messages | ≤ 24 | `trimMessagesForModel` |
| Text part chars | ≤ 12_000 | Stream-safe truncate |
| Total context chars | ≤ 96_000 | Prefer shrink older turns |

Source of truth: [`src/lib/performance-contract.ts`](../src/lib/performance-contract.ts).

## Guardrails

1. **Lazy boundaries** — Canvas lazy from chat; Monaco / Diff / Network / VersionTimeline / react-markdown lazy inside Canvas; Kernel Playground lazy + DEV-only.
2. **Stream-safe truncate** — `/api/chat` uses `trimMessagesForModel` (count + char), not count-only.
3. **Preview CSP / CDN** — `buildPreviewCsp` must not allow bare script CDNs; prompts must not recommend jsDelivr Chart.js.
4. **PWA warm** — `scheduleIdle` + skip `*.vercel.app` (SSO CORS).
5. **React Query** — `artifact-versions` fetch only when Versions panel opens (already); avoid blanket invalidate on every stream token.

## Findings (audit 2026-07-27)

| Sev | Finding | Disposition |
| --- | --- | --- |
| P0 | Chat route eagerly imported full Canvas (+ Monaco wrappers, markdown, docks) | **Fixed** — `React.lazy` Canvas on chat route |
| P0 | Canvas eagerly imported Monaco / Diff / Network / VersionTimeline / react-markdown on preview path | **Fixed** — view-gated lazy + Suspense |
| P0 | `/api/chat` trimmed message **count** only; long fenced HTML still bloated TTFB | **Fixed** — char + total budget clip |
| P1 | Responsive / project ZIP analysis ran sync on every HTML change before iframe paint | **Fixed** — `useDeferredValue` |
| P1 | PWA asset warm competed with first paint | **Fixed** — `scheduleIdle` |
| P1 | Kernel Playground static import (DEV route still in graph) | **Fixed** — lazy component |
| P1 | `onFinish` invalidates `thread` + `threads` (full refetch) | Deferred — optimistic cache patch (next PR) |
| P2 | No formal Lighthouse CI budgets | Deferred — unit contract + docs first |
| P2 | Share dialog mounts second preview iframe | Accepted — gated behind share UI |
| — | Marketplace / CRDT temptation | **Blocked** by this contract |

## Verify

```bash
bun run test:unit -- src/lib/performance-contract.test.ts
bun run typecheck
```

## Related

- [PERFORMANCE.md](./PERFORMANCE.md) — kernel complexity notes
- [ROADMAP.md](./ROADMAP.md) — sequencing (Observatory before Canvas/Marketplace)
