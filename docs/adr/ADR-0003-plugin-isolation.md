# ADR-0003: Plugin isolation (kernel facade + separate Plugin SDK)

- **Status:** Accepted
- **Date:** 2026-07 (kernel plugins + tag `v0.4.7-plugin-sdk`)
- **Evidence:** `src/lib/builder/plugins/`, `src/lib/plugin-sdk/`, no cross-imports between them

## Context

Plugins must not receive a live kernel, command manager, or writable registries by default. Marketplace-scale hosting is not implemented; foundations must still prevent privilege escalation.

## Decision

1. **Kernel plugins** receive a permission-gated `BuilderKernelFacade` (register node/command, subscribe-only events, read-only registry views). Core commands cannot be overwritten.
2. **Plugin SDK** is a separate package: manifests, frozen permissions, lifecycle FSM, sealed `PluginContext` with read accessors only. No live kernel reference.
3. Do **not** wire SDK ↔ kernel until an explicit bridge milestone.

## Consequences

- Positive: escalation paths are constrained; permissions are frozen post-validation in the SDK
- Positive: lifecycle is explicit (install/enable/disable/destroy)
- Negative: two permission vocabularies exist and are not interchangeable
- Negative: write/modify SDK permissions are declared but inert on context (later milestone)
