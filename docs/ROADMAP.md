# Roadmap

Status is derived from git tags, phase prompts under `.nexify-forge/prompts/`, hardening sign-off reports, and code wiring. Items without shipped code are marked explicitly.

## Released

| Version | Status | Evidence |
| --- | --- | --- |
| **v0.4.5** Builder Kernel foundation | Released | Tag `v0.4.5-kernel-foundation` (+ audited tag); [release notes](./releases/v0.4.5-kernel-foundation.md) |
| **v0.4.5.1** Builder Kernel hardening | Released | Tag `v0.4.5.1-hardening`; [release notes](./releases/v0.4.5.1-hardening.md) |
| **v0.4.7** Plugin SDK Foundation | Released | Tag `v0.4.7-plugin-sdk`; [release notes](./releases/v0.4.7-plugin-sdk.md) |
| **v0.4.8** Enterprise repository readiness | Released | Tag `v0.4.8-repo-readiness`; [release notes](./releases/v0.4.8-repo-readiness.md) — docs/governance only, **not** a runtime feature |
| **v0.5.0** Runtime Foundation slices A/B/C | Shipped on `main` | [ADR-0005](./adr/ADR-0005-builder-runtime-foundation.md); PRs [#21](https://github.com/youh4ck3dme/cosy-app-kit/pull/21) (A), [#24](https://github.com/youh4ck3dme/cosy-app-kit/pull/24) (B), [#25](https://github.com/youh4ck3dme/cosy-app-kit/pull/25) (C) — no separate `v0.5.0` tag required for slice landings |
| **v0.4.6** Kernel Observatory | Shipped (library export) | [ADR-0006](./adr/ADR-0006-kernel-observatory.md); [release notes](./releases/v0.4.6-kernel-observatory.md); code `src/lib/builder/diagnostics/` + public barrel — tag `v0.4.6-kernel-observatory` optional after merge |

## Planned next (sequenced)

| Item | Intent | Status |
| --- | --- | --- |
| Design Canvas (kernel consumer) | iframe / PostMessage canvas consuming `BuilderDocument` | Proposed — [ADR-0007](./adr/ADR-0007-design-canvas.md); RPC types only; **no host implementation** |
| Document persistence backends | Supabase / IndexedDB behind Slice B ports | Proposed — [ADR-0008](./adr/ADR-0008-document-persistence-backends.md) |
| plugin-sdk ↔ PluginRegistry bridge | Unified permission and registration story | Proposed — [ADR-0009](./adr/ADR-0009-plugin-sdk-registry-bridge.md) |
| Marketplace | Discover/install third-party plugins | Deferred last — [ADR-0010](./adr/ADR-0010-marketplace-deferred.md) |
| Visual import adapters | Vision / Figma / HTML → IR | Not yet implemented (IR compiler exists; adapters do not) |
| CRDT multiplayer | Collaborative editing | Not yet implemented |

## Product application (parallel track)

The TanStack Start AI Builder (chat, artifact canvas, Supabase auth) is a shipped application surface. It is **distinct** from the headless Builder Kernel design engine. See [product/architecture.md](./product/architecture.md).

## Sequencing principle

1. Isolate the kernel.
2. Harden invariants / undo safety.
3. Introduce sealed plugin foundations.
4. Add observability.
5. Only then attach Canvas / marketplace / mutation-rich plugin hosts.

This ordering is intentional. Marketplace-before-isolation is rejected.
