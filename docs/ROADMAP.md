# Roadmap

Status is derived from git tags, phase prompts under `.nexify-forge/prompts/`, hardening sign-off reports, and code wiring. Items without shipped code are marked explicitly.

## Released

| Version | Status | Evidence |
| --- | --- | --- |
| **v0.4.5** Builder Kernel foundation | Released | Tag `v0.4.5-kernel-foundation` (+ audited tag); [release notes](./releases/v0.4.5-kernel-foundation.md) |
| **v0.4.5.1** Builder Kernel hardening | Released | Tag `v0.4.5.1-hardening`; [release notes](./releases/v0.4.5.1-hardening.md) |
| **v0.4.7** Plugin SDK Foundation | Released | Tag `v0.4.7-plugin-sdk`; [release notes](./releases/v0.4.7-plugin-sdk.md) |
| **v0.4.8** Enterprise repository readiness | Docs PR + tag `v0.4.8-repo-readiness` after merge | Documentation, GitHub governance, ADRs, runbooks — **not** a runtime feature |

## In progress / incomplete

| Version | Status | Notes |
| --- | --- | --- |
| **v0.4.6** Kernel Observatory | Future milestone | Diagnostics modules may exist as local untracked files; not exported from the public builder barrel and not a released tag |

## Planned next

| Version | Intent | Status |
| --- | --- | --- |
| **v0.5.0** Builder Runtime Foundation | Wire kernel into a durable runtime surface (host session, safer boundaries) | Planned |
| Design Canvas (kernel consumer) | iframe / PostMessage canvas consuming `BuilderDocument` | Not yet implemented (RPC types only) |
| Visual import adapters | Vision / Figma / HTML → IR | Not yet implemented (IR compiler exists; adapters do not) |
| Marketplace | Discover/install third-party plugins at product scale | Not yet implemented |
| Kernel persistence | Supabase / IndexedDB for documents | Not yet implemented |
| CRDT multiplayer | Collaborative editing | Not yet implemented |
| plugin-sdk ↔ kernel PluginRegistry bridge | Unified permission and registration story | Not yet implemented |

## Product application (parallel track)

The TanStack Start AI Builder (chat, artifact canvas, Supabase auth) is a shipped application surface. It is **distinct** from the headless Builder Kernel design engine. See [product/architecture.md](./product/architecture.md).

## Sequencing principle

1. Isolate the kernel.
2. Harden invariants / undo safety.
3. Introduce sealed plugin foundations.
4. Add observability.
5. Only then attach Canvas / marketplace / mutation-rich plugin hosts.

This ordering is intentional. Marketplace-before-isolation is rejected.
